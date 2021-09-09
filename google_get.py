from __future__ import print_function
import datetime
import pickle
import pandas as pd
import os.path
import db_functions
import functions
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request


def scopes():
	SCOPES = ['https://www.googleapis.com/auth/calendar']
	creds = None
	if os.path.exists('token.pickle'):
		with open('token.pickle', 'rb') as token:
			creds = pickle.load(token)
	if not creds or not creds.valid:
		if creds and creds.expired and creds.refresh_token:
			creds.refresh(Request())
		else:
			flow = InstalledAppFlow.from_client_secrets_file('/home/kokogabriel/credentials.json', SCOPES)
			creds = flow.run_local_server(port=0)
		with open('token.pickle', 'wb') as token:
			pickle.dump(creds, token)
	
	return creds

def main(username,start,end=None):
	
	creds = scopes()
	admin_employers = db_functions.check_admin_employers(username)
	service = build('calendar', 'v3', credentials=creds)
	events = []
	
	for employer in admin_employers:
		events_result = service.events().list(calendarId='primary',timeMin=start,timeMax=end,singleEvents=True,orderBy='startTime',q=employer).execute()
		events_for_employer = events_result.get('items', [])
		events.extend(events_for_employer)
	if not events:
		print('No upcoming events found.')
	
	cal_id = [event['id'] for event in events]
	db_date = [pd.to_datetime(event['start']['dateTime']).strftime('%Y-%m-%d') if 'dateTime' in event['start'] else  event['start']['date'] for event in events]
	start_time = [pd.to_datetime(event['start']['dateTime'][:18]) if 'dateTime' in event['start'] else pd.to_datetime(event['start']['date']) for event in events ]
	end_time = [pd.to_datetime(event['end']['dateTime'][:18]) if 'dateTime' in event['end'] else pd.to_datetime(event['end']['date']) for event in events ]
	title = [event['summary'] for event in events]

	frame = pd.DataFrame(data= {'cal_id':cal_id,'start_time':start_time,'end_time':end_time,'title':title},index=pd.to_datetime(db_date))
	frame.index.name = 'db_date'
	frame['category'] = 'work'
	
	return frame

def delete_event(cal_id):
	creds = scopes()
	service = build('calendar', 'v3', credentials=creds)
	service.events().delete(calendarId='primary', eventId=cal_id).execute()

def create_event(employer,hometown,start,end,all_day):
	creds = scopes()
	service = build('calendar', 'v3', credentials=creds)
	time_zone = functions.get_time_zone(hometown)
	if all_day:
		event = {'summary': employer,'start': {'date': start,'timeZone': time_zone},'end': {'date': end,'timeZone': time_zone}}
	else:
		event = {'summary': employer,'start': {'dateTime': pd.to_datetime(start).isoformat(),'timeZone': time_zone},'end': {'dateTime': pd.to_datetime(end).isoformat(),'timeZone': time_zone}}
	print(event)
	service.events().insert(calendarId='primary', body=event).execute()
	

def edit_event(cal_id,employer,hometown,start,end):
	
	creds = scopes()
	service = build('calendar', 'v3', credentials=creds)
	time_zone = functions.get_time_zone(hometown)
	event = service.events().get(calendarId='primary', eventId=cal_id).execute()
	event['summary'] = employer
	#if event['start']['date']:
	#	del event['start']['date']
	#	del event['end']['date']
	event['start'] = {'dateTime':pd.to_datetime(start).isoformat(),'timeZone': time_zone}
	event['end'] = {'dateTime':pd.to_datetime(end).isoformat(),'timeZone': time_zone}
	#event['timeZone'] = time_zone
	service.events().update(calendarId='primary', eventId=event['id'], body=event).execute()
	#event = {'summary': employer,'start': {'dateTime': pd.to_datetime(start).isoformat(),'timeZone': time_zone},'end': {'dateTime': pd.to_datetime(end).isoformat(),'timeZone': time_zone}}
	#print(event)
	#service.events().insert(calendarId='primary', body=event).execute()
	
