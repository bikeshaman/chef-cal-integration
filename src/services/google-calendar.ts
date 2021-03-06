import { JWT } from 'google-auth-library';
import { google } from 'googleapis';
import moment from 'moment';
import { Chef, Event } from '@/models';

interface WriteAccessArg {
  calendarId: string;
  email: string;
}

/** Interface for Google's Calendar API */
export default class GoogleCalendarService {
  /** APIs for Google Calendar */
  private static readonly chefSchedule = google.calendar('v3');

  /** Provides service account authentication for Google Calendar */
  private static readonly googleAuthInstance = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.CREDENTIALS),
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });

  /** Obtain a JWT to authenticate Google Calendar requests */
  private static getJWT() {
    // TODO reuse token and refresh only as needed
    return this.googleAuthInstance.getClient() as Promise<JWT>;
  }

  /**
   * Add a "writer" access control rule to the Google Calendar specified by passed-in
   * calendarId, for user with passed-in email
   *
   * @param {WriteAccessArg} user object containing `calendarId` and user's `email`
   */
  static async addWriteAccessUserToCalendar({ calendarId, email }: WriteAccessArg) {
    const auth = await this.getJWT();
    await this.chefSchedule.acl.insert({
      auth,
      calendarId,
      requestBody: { role: 'writer', scope: { type: 'user', value: email } },
    });
  }

  /**
   * Insert events into a Google calendar
   *
   * @param {Event[]} events array of events to be inserted
   * @param {string} [calendarId=primary] (optional) calendar to which events will be added
   */
  static async addEvents(events: Event[], calendarId = 'primary') {
    const auth = await this.getJWT();
    const requests = events.map(event =>
      this.chefSchedule.events.insert({ auth, calendarId, requestBody: event }),
    );
    await Promise.all(requests);
  }

  /**
   * Query chefs' availability from their personal "Chef Schedule" Google calendar,
   * and use `Chef.prototype.setAvailabilityNextWeek` to set each chef's availability
   *
   * @param chefs array of chefs for which availability will be queried and set
   */
  static async queryAndSetChefsAvailabilityNextWeek(chefs: Chef[]) {
    const nextWeekSunday = 6;
    const nextWeekSaturday = 12;
    const auth = await this.getJWT();
    try {
      const response = await this.chefSchedule.freebusy.query({
        auth,
        requestBody: {
          items: chefs.map(chef => ({ id: chef.calendarId })),
          timeMax: moment()
            .day(nextWeekSaturday)
            .format(),
          timeMin: moment()
            .day(nextWeekSunday)
            .format(),
          timeZone: 'America/Phoenix',
        },
      });
      chefs.forEach(chef =>
        chef.setAvailabilityNextWeek(response.data.calendars[chef.calendarId]?.busy),
      );
    } catch (error) {} // TODO error handling
  }
}
