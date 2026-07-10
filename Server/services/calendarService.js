const { google } = require("googleapis");

function getAuthClient() {
  console.log("[Google Calendar] Creating OAuth client");

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  if (process.env.GOOGLE_REFRESH_TOKEN) {
    console.log("[Google Calendar] Refresh token found");
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });
  } else {
    console.log("[Google Calendar] No refresh token found");
  }

  return oauth2Client;
}

function getCalendar() {
  console.log("[Google Calendar] Initializing Calendar API");
  const auth = getAuthClient();
  return google.calendar({ version: "v3", auth });
}

function safeDate(d) {
  const dt = new Date(d);

  if (Number.isNaN(dt.getTime())) {
    console.log("[Google Calendar] Invalid date:", d);
    return null;
  }

  return dt.toISOString();
}

exports.createEvent = async (appointment, doctorEmail, patientEmail) => {
  try {
    console.log("\n========== CREATE GOOGLE CALENDAR EVENT ==========");
    console.log("Appointment ID:", appointment._id);
    console.log("Doctor Email:", doctorEmail);
    console.log("Patient Email:", patientEmail);

    const calendar = getCalendar();

    const start = safeDate(appointment.slotStart);
    const end = safeDate(appointment.slotEnd);

    console.log("Start:", start);
    console.log("End:", end);

    if (!start || !end) {
      console.log("[Google Calendar] Invalid start/end time");
      return null;
    }

    const attendees = [];

    if (doctorEmail) attendees.push({ email: doctorEmail });
    if (patientEmail) attendees.push({ email: patientEmail });

    console.log("Attendees:", attendees);

    const resp = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: "Appointment",
        description: `Appointment ${appointment._id}`,
        start: {
          dateTime: start,
        },
        end: {
          dateTime: end,
        },
        attendees,
      },
      sendUpdates: "all",
    });

    console.log("[Google Calendar] Event created successfully");
    console.log("Event ID:", resp.data.id);
    console.log("Event Link:", resp.data.htmlLink);
    console.log("=================================================\n");

    return resp?.data?.id || null;
  } catch (err) {
    console.log("\n========== GOOGLE CALENDAR ERROR ==========");
    console.error(err.message);

    if (err.response?.data) {
      console.error(err.response.data);
    }

    console.log("===========================================\n");

    return null;
  }
};

exports.updateEvent = async (calendarEventId, updates) => {
  try {
    console.log("\n========== UPDATE GOOGLE CALENDAR EVENT ==========");
    console.log("Event ID:", calendarEventId);
    console.log("Updates:", updates);

    const calendar = getCalendar();

    await calendar.events.patch({
      calendarId: "primary",
      eventId: calendarEventId,
      requestBody: updates || {},
      sendUpdates: "all",
    });

    console.log("[Google Calendar] Event updated successfully");
    console.log("=================================================\n");

    return true;
  } catch (err) {
    console.log("\n========== GOOGLE CALENDAR UPDATE ERROR ==========");
    console.error(err.message);

    if (err.response?.data) {
      console.error(err.response.data);
    }

    console.log("==================================================\n");

    return false;
  }
};

exports.deleteEvent = async (calendarEventId) => {
  try {
    console.log("\n========== DELETE GOOGLE CALENDAR EVENT ==========");
    console.log("Event ID:", calendarEventId);

    if (!calendarEventId) {
      console.log("[Google Calendar] No event ID provided");
      return true;
    }

    const calendar = getCalendar();

    await calendar.events.delete({
      calendarId: "primary",
      eventId: calendarEventId,
      sendUpdates: "all",
    });

    console.log("[Google Calendar] Event deleted successfully");
    console.log("=================================================\n");

    return true;
  } catch (err) {
    console.log("\n========== GOOGLE CALENDAR DELETE ERROR ==========");
    console.error(err.message);

    if (err.response?.data) {
      console.error(err.response.data);
    }

    console.log("==================================================\n");

    return false;
  }
};