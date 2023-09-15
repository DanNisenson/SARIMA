const fs = require('fs');
import { config } from 'process';
import { SarimaConfig } from '../types';
import { makeGridSearch, computeSARIMA, mapArrayFromRawData } from './grid_search';

const GRID_VALUES: SarimaConfig<number[]> = {
  p: [0, 1, 2],
  d: [0, 1],
  q: [0, 1, 2],
  P: [0, 1, 2],
  D: [0, 1],
  Q: [0, 1, 2],
  s: [90],
};

const RAW_DATA = {
  weekk: JSON.parse(fs.readFileSync('./data/likes-weekly.json', 'utf8')),
  day: JSON.parse(fs.readFileSync('./data/likes-daily.json', 'utf8')),
};
const KPI = 'likes';

const CONFIG = { auto: true, d: [0, 1], verbose: true };
const FORECAST_POINTS = { week: 2, day: 15 };

const DIM = 'day';

const main = () => {
  const data = mapArrayFromRawData(RAW_DATA[DIM], KPI);
  const slicedData = data.slice(0);
  const forecast = computeSARIMA(CONFIG, slicedData, FORECAST_POINTS[DIM]);

  console.log('data:', slicedData, 'forecast:', forecast);
  // makeGridSearch(RAW_DATA, KPI, GRID_VALUES);
};

main();

// const checkDates = () => {
//   let lastDate = 'none';
//   let lastDay = 0;
//   RAW_DATA.forEach((item: any, i: number) => {
//     if (!item?.date) console.log(lastDate);
//     const day = Number(item.date.split('-')[2]);

//     if (i === 0) return (lastDay = day);
//     if (day !== lastDay + 1) console.log(item.date);
//     lastDay = day;
//   });
// };

// checkDates();
