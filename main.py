
from flask import Flask, redirect, url_for, request,json,session,render_template,jsonify
#import re
#import datetime
#import pandas as pd
#import numpy as np
#import json
import db_functions
#import requests
import pymysql
#import os
import external_functions


app = Flask(__name__)
app.secret_key = 'ironpond_2'

@app.route('/bi_data', methods=['GET','POST'])
def bi_data():
	#grab the data as usual
	data = db_functions.sales()
	
	#we need metadata for the html elements and save in cookies
	meta_data = [{'name':i[0],'count':int(i[1]),'dtype':i[2].name}   for i in zip(data.nunique().index,data.nunique().values,data.dtypes)]
	meta_data.reverse()
	
	
	if request.method == 'POST':
		#send the form to a dictionary
		send_values = {key:val for key,val in request.form.items()}
		
		#set the attributes from the data
		highchart = external_functions.Highcharts(send_values['x_axis'],send_values['y_axis'],send_values['visual'],send_values['type'])
		highchart.corr_cat = send_values['category'] if 'category' in send_values else False
		highchart.agg_type = send_values['agg_type'] if send_values['type'] == 'aggregate' else False
		highchart.date_string = send_values['date_string'] if 'date_string' in send_values else False
		
		#create the frame and array.grab the meta data for the html divs.
		new_data = highchart.corr_frame(data) if highchart.chart_type == 'correlation' else highchart.agg_frame(data)
		new_json = highchart.corr_to_json(new_data) if highchart.chart_type == 'correlation' else highchart.agg_to_json(new_data)

		new_json['meta_data'] = meta_data

		#remove last cookie, reload it with new class attributes
		session.pop('state',None)
		session['state'] = vars(highchart)

		return jsonify(new_json)
		
	elif request.method == 'GET' and 'state' not in session:
		#plug in the variables
		highchart = external_functions.Highcharts('OrderDate','Total','line','aggregate',agg_type='sum',date_string='%Y-%m-%d')
		
		#for the cookies
		for_next = vars(highchart)
		
		#create the frame and json array. meta data and state for html interfacing
		new_data = highchart.corr_frame(data) if highchart.chart_type == 'correlation' else highchart.agg_frame(data)
		new_json = highchart.corr_to_json(new_data) if highchart.chart_type == 'correlation' else highchart.agg_to_json(new_data)
		new_json['meta_data'] = meta_data
		new_json['state'] = vars(highchart)
		
		#save attributes to cookies
		session['state'] = for_next
		return jsonify(new_json)
		
	elif request.method == 'GET' and 'state' in session:
		#get the attributes stored in session, send to the class structure. no changes to cookies are made here.
		for_next = session['state']
		highchart = external_functions.Highcharts(**for_next)
		
		#create the frame and json array. meta data and state for html interfacing
		new_data = highchart.corr_frame(data) if highchart.chart_type == 'correlation' else highchart.agg_frame(data)
		new_json = highchart.corr_to_json(new_data) if highchart.chart_type == 'correlation' else highchart.agg_to_json(new_data)
		new_json['meta_data'] = meta_data
		new_json['state'] = vars(highchart)
		print(new_json['state'])
		return jsonify(new_json)

@app.route("/")
def bi_page():
	#session.pop('state',None)
	return render_template('index.html')


if (__name__ == "__main__"):
	app.run(port = 5000, debug=True)
#highchart = external_functions.Highcharts('CustomerCountry','Total','column','timeseries',agg_type='sum',date_string='%Y')
#need to adjust: auto height and width depending values, css gradient for scatter bool_points, dynamic sql select of columns
#set up alert box
'''
this is how to send a customized query
	query = db_functions.Db_command()
	col_array = ['Quantity','Total']
	query.db_rel(col_array)
	data = db_functions.custom_query(query.command,query.joins)
	'''
