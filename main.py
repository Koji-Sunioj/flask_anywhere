
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
def profile_validation():
	data = db_functions.sales()
	
	#get the name, count and data type for the select inputs on the page
	meta_data = [{'name':i[0],'count':int(i[1]),'dtype':i[2].name}   for i in zip(data.nunique().index,data.nunique().values,data.dtypes)]
	
	#plug in the variables
	json_data = external_functions.translate_data(data,'%B','SupplierName','Total','sum','scatter')
	json_data['meta_data'] = meta_data
	
	#make a json array for charts, Y axis
	'''
	series = []
	data = data[data.sum().sort_values(ascending=False).index]
	for i in np.arange(0,len(data.columns)):
		stuff = {'name':data.columns[i],'data':[ round(i,2)  for i in data[data.columns[i]]],'type':'scatter'}
		#stuff = {'name':data.columns[i],'data':[ round(i,2) if i > 0 else 'null' for i in data[data.columns[i]]],'type':'line'}
		series.append(stuff)
	
	#the X axis is the index and what it is formatted to
	xAxis = {'categories':[i for i in data.index],'title':data.index.name}
	'''
	return jsonify(json_data)

@app.route("/")
def hello_world():
	return render_template('index.html')


if (__name__ == "__main__"):
	app.run(port = 5000, debug=True)
