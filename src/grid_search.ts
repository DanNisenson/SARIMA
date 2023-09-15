import { stringify } from 'csv/sync';
import { IData, SarimaConfig } from '../types';
const ARIMA = require('arima');
const fs = require('fs');

export const makeGridSearch = (
  rawData: IData[],
  kpi: string,
  gridValues: SarimaConfig<number[]>
) => {
  const kpiData: number[] = mapArrayFromRawData(rawData, kpi);

  const [trainingData, validationData] = splitData(kpiData);

  const [bestConfiguration, bestRMSE] = getBestConfig(gridValues, trainingData, validationData);

  writeResultsToFile(kpi, bestConfiguration, bestRMSE, gridValues);
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

export const computeSARIMA = (
  config: { [key: string]: number | number[] | boolean },
  trainingData: number[],
  pointsAmt: number
) => {
  const arima = new ARIMA(config).train(trainingData);
  const [pred] = arima.predict(pointsAmt);
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

const writeResultsToFile = (
  kpi: string,
  bestConfig: any,
  bestRMSE: number,
  gridValues: SarimaConfig<number[]>
) => {
  const result = [];

  const configKeys = Object.keys(bestConfig);
  const bestConfigArr = configKeys.map(key => bestConfig[key]);
  const gridValuesArr = configKeys.map(key => JSON.stringify(gridValues[key]));

  result.push(kpi);
  result.push(...bestConfigArr);
  result.push(bestRMSE);
  result.push(...gridValuesArr);

  fs.appendFileSync('./results.csv', stringify([result]), (err: any) => {
    if (err) console.log('Some error occured - file either not saved or corrupted file saved.');
    else console.log("It's saved!");
  });
};

export const mapArrayFromRawData = (data: IData[], field: string) => {
  return (
    data?.map(
      (item: any) => (typeof item?.[field] === 'undefined' ? null : item?.[field]) // remove datapoints from display if no data
    ) || []
  );
};
