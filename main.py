
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


app = Flask(__name__)
app.secret_key = 'ironpond_2'

@app.route('/bi_data', methods=['GET'])
def profile_validation():
	data = db_functions.sales()
	print(data.columns)
	#data = data[data['CustomerName'] == 'Ernst Handel']
	data = pd.pivot_table(data,index=data.index,columns=['ShipperName','SupplierName'],values='Total',aggfunc='sum').fillna(0).resample('m').sum().cumsum()
	series = []
	for i in np.arange(0,len(data.columns)):
		stuff = {'name':data.columns[i],'data':[ round(i,2) for i in data[data.columns[i]]],'type':'scatter'}
		series.append(stuff)
	xAxis = {'categories':[i.strftime('%m-%Y') for i in data.index],'title':data.index.name}
	return jsonify({'series':series,'xAxis':xAxis})

@app.route("/")
def hello_world():
	return render_template('index.html')


if (__name__ == "__main__"):
	app.run(port = 5000, debug=True)
