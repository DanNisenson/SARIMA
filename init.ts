const ARIMA = require('arima');
const fs = require('fs');
import { generate, parse, transform, stringify } from 'csv/sync';

console.log('Hello world!');

export interface IData {
  [key: string]: string | number | boolean;
}

export type SarimaConfig<T> = {
  [key: string]: T;
};

const RAW_DATA = JSON.parse(fs.readFileSync('./revenues-qty_ordered.json', 'utf8'));

const KPI = 'revenues';

const GRID_VALUES: SarimaConfig<number[]> = {
  p: [0, 1, 2],
  d: [0, 1],
  q: [0, 1, 2],
  P: [0, 1, 2],
  D: [0, 1],
  Q: [0, 1, 2],
  s: [90],
};

const main = () => {
  const kpiData: number[] = mapArrayFromRawData(RAW_DATA, KPI);

  const [trainingData, validationData] = splitData(kpiData);

  const [bestConfiguration, bestRMSE] = getBestConfig(GRID_VALUES, trainingData, validationData);

  writeResultsToFile(bestConfiguration, bestRMSE);
};

const splitData = (data: number[]) => {
  const trainValidationSplit = 0.8;
  const totalDataPoints = data.length;
  const splitIndex = Math.floor(totalDataPoints * trainValidationSplit);

  const trainingData = data.slice(0, splitIndex);
  const validationData = data.slice(splitIndex);
  return [trainingData, validationData];
};

const getBestConfig = (
  gridValues: { [key: string]: number[] },
  trainingData: number[],
  validationData: number[]
) => {
  let bestConfiguration: any = null; // Replace with a type that matches your configuration
  let bestRMSE = Infinity;

  for (const p of gridValues.p) {
    for (const d of gridValues.d) {
      for (const q of gridValues.q) {
        for (const P of gridValues.P) {
          for (const D of gridValues.D) {
            for (const Q of gridValues.Q) {
              for (const s of gridValues.s) {
                // Create and train a SARIMA model with the current hyperparameters using trainingData
                const config = { p, d, q, P, D, Q, s };
                const predictedValues = computeSARIMA(config, trainingData, validationData.length);

                // Calculate the RMSE
                const rmse = calculateRMSE(validationData, predictedValues);

                // Check if this configuration has a better RMSE
                if (rmse < bestRMSE) {
                  bestRMSE = rmse;
                  bestConfiguration = { p, d, q, P, D, Q, s };
                }
              }
            }
          }
        }
      }
    }
  }
  return [bestConfiguration, bestRMSE];
};

const computeSARIMA = (
  config: { [key: string]: number },
  trainingData: number[],
  pointsAmt: number
) => {
  // const autoArima = { auto: true, s: 365, verbose: true };
  // const sarima = { p: 3, d: 0, q: 2, P: 0, D: 0, Q: 0, s: 30 };
  const arima = new ARIMA(config).train(trainingData);
  const [pred, error] = arima.predict(pointsAmt);
  return pred;
};

const calculateRMSE = (actualValues: number[], predictedValues: number[]): number => {
  if (actualValues.length !== predictedValues.length) {
    throw new Error('Arrays must have the same length');
  }

  const n = actualValues.length;
  let sumSquaredErrors = 0;

  for (let i = 0; i < n; i++) {
    const error = actualValues[i] - predictedValues[i];
    sumSquaredErrors += error * error;
  }

  const meanSquaredError = sumSquaredErrors / n;
  const rmse = Math.sqrt(meanSquaredError);

  return rmse;
};

const writeResultsToFile = (bestConfig: any, bestRMSE: number) => {
  const file = fs.readFileSync('./results.csv', 'utf8');
  // const parsed = parse(file);
  const result = [];

  const configKeys = Object.keys(bestConfig);
  const bestConfigArr = configKeys.map(key => bestConfig[key]);
  const gridValuesArr = configKeys.map(key => JSON.stringify(GRID_VALUES[key]));

  result.push(KPI);
  result.push(...bestConfigArr);
  result.push(bestRMSE);
  result.push(...gridValuesArr);

  fs.appendFileSync('./results.csv', stringify([result]), (err: any) => {
    if (err) console.log('Some error occured - file either not saved or corrupted file saved.');
    else console.log("It's saved!");
  });
};

const getNumOfForecastPoints = () => {
  return 15;
};

const mapArrayFromRawData = (data: IData[], field: string) => {
  return (
    data?.map(
      (item: any) => (typeof item?.[field] === 'undefined' ? null : item?.[field]) // remove datapoints from display if no data
    ) || []
  );
};

main();

const checkDates = () => {
  let lastDate = 'none';
  let lastDay = 0;
  RAW_DATA.forEach((item: any, i: number) => {
    if (!item?.date) console.log(lastDate);
    const day = Number(item.date.split('-')[2]);

    if (i === 0) return (lastDay = day);
    if (day !== lastDay + 1) console.log(item.date);
    lastDay = day;
  });
};

// checkDates();
