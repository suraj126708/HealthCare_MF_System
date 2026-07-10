const { google } = require('googleapis');

function getAuthClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  if (process.env.GOOGLE_REFRESH_TOKEN) {
    oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  }

  return oauth2Client;
}

function getCalendar() {
  const auth = getAuthClient();
  return google.calendar({ version: 'v3', auth });
}

function safeDate(d) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

// Best-effort: return null/false on any failure (don’t crash booking)
exports.createEvent = async (appointment, doctorEmail, patientEmail) => {
  try {
    const calendar = getCalendar();

    const start = safeDate(appointment.slotStart);
    const end = safeDate(appointment.slotEnd);
    if (!start || !end) return null;

    const attendees = [];
    if (doctorEmail) attendees.push({ email: doctorEmail });
    if (patientEmail) attendees.push({ email: patientEmail });

    const resp = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: 'Appointment',
        description: `Appointment ${appointment._id}`,
        start: { dateTime: start },
        end: { dateTime: end },
        attendees,
      },
      sendUpdates: 'all',
    });

    return resp?.data?.id || null;
  } catch {
    return null;
  }
};

exports.updateEvent = async (calendarEventId, updates) => {
  try {
    const calendar = getCalendar();
    await calendar.events.patch({
      calendarId: 'primary',
      eventId: calendarEventId,
      requestBody: updates || {},
      sendUpdates: 'all',
    });
    return true;
  } catch {
    return false;
  }
};

exports.deleteEvent = async (calendarEventId) => {
  try {
    if (!calendarEventId) return true;
    const calendar = getCalendar();
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: calendarEventId,
      sendUpdates: 'all',
    });
    return true;
  } catch {
    return false;
  }
};

