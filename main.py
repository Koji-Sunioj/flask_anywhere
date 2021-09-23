
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

@app.route('/bi_data', methods=['GET'])
def bi_data():
	data = db_functions.sales()
	
	#get the name, count and data type for the select inputs on the page
	meta_data = [{'name':i[0],'count':int(i[1]),'dtype':i[2].name}   for i in zip(data.nunique().index,data.nunique().values,data.dtypes)]
	
	#plug in the variables
	highchart = external_functions.Highcharts('EmployeeName','Total','column','timeseries',agg_type='mean')
	
	if highchart.chart_type == 'correlation':
		new_data = highchart.corr_frame(data)
		new_json = highchart.corr_to_json(new_data)
	else:
		new_data = highchart.agg_frame(data)
		new_json = highchart.agg_to_json(new_data)
	new_json['meta_data'] = meta_data
	return jsonify(new_json)

@app.route("/")
def hello_world():
	return render_template('index.html')


if (__name__ == "__main__"):
	app.run(port = 5000, debug=True)
#highchart = external_functions.Highcharts('CustomerCountry','Total','column','timeseries',agg_type='sum',date_string='%Y')
