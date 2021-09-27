
from flask import Flask, redirect, url_for, request,json,session,render_template,jsonify
import re
import datetime
import pandas as pd
import numpy as np
import json
import db_functions
import requests
import pymysql
import os
import external_functions


app = Flask(__name__)
app.secret_key = 'ironpond_2'

@app.route('/bi_data', methods=['GET','POST'])
def bi_data():
	if request.method == 'POST':
		#send the form to a dictionary
		send_values = {key:val for key,val in request.form.items()}
		
		#grab the data as usual
		data = db_functions.sales()
		
		#we need metadata for the html elements and save in cookies
		meta_data = [{'name':i[0],'count':int(i[1]),'dtype':i[2].name}   for i in zip(data.nunique().index,data.nunique().values,data.dtypes)]
		meta_data.reverse()
		
		#handle the chart types
		if send_values['type'] == 'correlation':
			highchart = external_functions.Highcharts(send_values['x_axis'],send_values['y_axis'],send_values['visual'],send_values['type'])
			if 'category' in send_values:
				highchart.corr_cat = send_values['category']
			new_data = highchart.corr_frame(data)
			new_json = highchart.corr_to_json(new_data)
		new_json['meta_data'] = meta_data
		session['state'] = new_json
		return jsonify(new_json)
		
	if request.method == 'GET' and 'state' not in session:
		#grab db data
		data = db_functions.sales()
		#get the name, count and data type for the select inputs on the page
		meta_data = [{'name':i[0],'count':int(i[1]),'dtype':i[2].name}   for i in zip(data.nunique().index,data.nunique().values,data.dtypes)]
		meta_data.reverse()
		
		#plug in the variables
		highchart = external_functions.Highcharts('Price','Quantity','scatter','correlation',corr_cat='CategoryName')
		
		if highchart.chart_type == 'correlation':
			new_data = highchart.corr_frame(data)
			new_json = highchart.corr_to_json(new_data)
		else:
			new_data = highchart.agg_frame(data)
			new_json = highchart.agg_to_json(new_data)
		new_json['meta_data'] = meta_data
		session['state'] = new_json
		print('fresh load')
		return jsonify(new_json)
	elif request.method == 'GET' and session['state']:
		new_json = session['state']
		print('already loaded')
		return jsonify(new_json)

@app.route("/")
def hello_world():
	#session.pop('state',None)
	return render_template('index.html')


if (__name__ == "__main__"):
	app.run(port = 5000, debug=True)
#highchart = external_functions.Highcharts('CustomerCountry','Total','column','timeseries',agg_type='sum',date_string='%Y')
