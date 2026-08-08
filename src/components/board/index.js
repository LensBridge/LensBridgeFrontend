// Board management components.
//
// Quotes and Jummah are both weekly-scoped on the backend (WeeklyContent owns
// `quotes` and `jummahPrayers`), so WeeklyContentEditor covers what the old
// DailyContentEditor and JummahEditor used to do separately.
export { default as BoardConfigEditor, TickerEditor } from './BoardConfigEditor';
export { default as EventsEditor } from './EventsEditor';
export { default as PostersEditor } from './PostersEditor';
export { default as FramesEditor } from './FramesEditor';
export { default as WeeklyContentEditor } from './WeeklyContentEditor';
