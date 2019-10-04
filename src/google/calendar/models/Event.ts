import { calendar_v3 as calendarV3 } from 'googleapis/build/src/apis/calendar/v3';
import EventDateTime from './EventDateTime';

/**
 * Represents a calendar event conforming to the Google Calendar API's `Event` type interface.
 *
 * @class
 * @implements {Schema$Event}
 */
export default class Event implements calendarV3.Schema$Event {
  summary: string;
  description?: string;
  start: EventDateTime;
  end: EventDateTime;

  constructor(
    summary: string,
    start: Date,
  ) {
    this.summary = summary;
    this.start = new EventDateTime(start);
    this.end = this.start;
  }
}
