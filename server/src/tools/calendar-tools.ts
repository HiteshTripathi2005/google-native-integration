import { tool } from "ai";
import { google } from "googleapis";
import { z } from "zod";
// import { oauth2Client } from "../routes/google-auth-route.ts";
import { oauth2Client } from "../index.ts";


export const listCalendarEvents = tool({
    name: 'list_calendar_events',
    description: 'List the events from a calendar',
    inputSchema: z.object({
        "calendarId": z.string().describe('The ID of the calendar to get the events from'),
    }),
    execute: async ({ calendarId }: { calendarId: string }) => {
        try {
            const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
            console.log(`Listing events for calendar: ${calendarId}`);
            const response = await calendar.events.list(
                { 
                    calendarId: calendarId,
                    maxResults: 10,
                });
            console.log(`Response: ${JSON.stringify(response)}`);
            return response;
        } catch (error) {
            console.error(`Error getting calendar events: ${error}`);
            return `Error getting calendar events: ${error instanceof Error ? error.message : String(error)}`;
        }
    },
});

export const createCalendarEvent = tool({
    name: 'create_calendar_event',
    description: 'Create a new calendar event',
    inputSchema: z.object({
        "calendarId": z.string().describe('The ID of the calendar to create the event in').default('primary'),
        "event": z.object({
            "summary": z.string().describe('The summary of the event'),
            "description": z.string().describe('The description of the event'),
            "start": z.object({
                "dateTime": z.string().describe('The start date and time of the event'),
                "timeZone": z.string().describe('The time zone of the event').default('UTC'),
            }),
            "end": z.object({
                "dateTime": z.string().describe('The end date and time of the event'),
                "timeZone": z.string().describe('The time zone of the event').default('UTC'),
            }),
        }),
    }),
    execute: async ({ calendarId, event }: { calendarId: string, event: { summary: string, description: string, start: { dateTime: string, timeZone: string }, end: { dateTime: string, timeZone: string } } }) => {
        try {
            const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
            const response = await calendar.events.insert({
                calendarId,
                requestBody: {
                    summary: event.summary,
                    description: event.description,
                    start: {
                        dateTime: event.start.dateTime,
                        timeZone: event.start.timeZone,
                    },
                    end: {
                        dateTime: event.end.dateTime,
                        timeZone: event.end.timeZone,
                    },
                }
            });
            return response;
        } catch (error) {
            console.error(`Error creating calendar event: ${error}`);
            return `Error creating calendar event: ${error instanceof Error ? error.message : String(error)}`;
        }
    },
});

export const deleteCalendarEvent = tool({
    name: 'delete_calendar_event',
    description: 'Delete a calendar event',
    inputSchema: z.object({
        "calendarId": z.string().describe('The ID of the calendar to delete the event from'),
        "eventId": z.string().describe('The ID of the event to delete'),
    }),
    execute: async ({ calendarId, eventId }: { calendarId: string, eventId: string }) => {
        try {
            const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
            const response = await calendar.events.delete({
                calendarId,
                eventId,
            });
            return response;
        }
        catch (error) {
            console.error(`Error deleting calendar event: ${error}`);
            return `Error deleting calendar event: ${error instanceof Error ? error.message : String(error)}`;
        }
    },
});

export const listAllCalendars = tool({
    name: 'list_all_calendars',
    description: 'List all the calendars',
    inputSchema: z.object({}),
    execute: async () => {
        try {
            const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
            const response = await calendar.calendarList.list({});
            return response;
        } catch (error) {
            console.error(`Error getting all calendars: ${error}`);
            return `Error getting all calendars: ${error instanceof Error ? error.message : String(error)}`;
        }
    },
});

export const createCalendar = tool({
    name: 'create_calendar',
    description: 'Create a new calendar',
    inputSchema: z.object({
        "name": z.string().describe('The name of the calendar to create'),
    }),
    execute: async ({ name }: { name: string }) => {
        try {
            const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
            const response = await calendar.calendars.insert({
                requestBody: {
                    summary: name,
                },
            });
            return response;
        } catch (error) {
            console.error(`Error creating calendar: ${error}`);
            return `Error creating calendar: ${error instanceof Error ? error.message : String(error)}`;
        }
    },
});

export const deleteCalendar = tool({
    name: 'delete_calendar',
    description: 'Delete a calendar',
    inputSchema: z.object({
        "calendarId": z.string().describe('The ID of the calendar to delete not the name'),
    }),
    execute: async ({ calendarId }: { calendarId: string }) => {
        try {
            const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
            console.log(`Deleting calendar: ${calendarId}`);
            const response = await calendar.calendars.delete({
                calendarId,
            });
            console.log(`Response: ${JSON.stringify(response)}`);
            return response;
        } catch (error) {
            console.error(`Error deleting calendar: ${error}`);
            return `Error deleting calendar: ${error instanceof Error ? error.message : String(error)}`;
        }
    },
});