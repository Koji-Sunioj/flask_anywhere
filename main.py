from flask import Flask, redirect, url_for, request,json,session,render_template,jsonify
import db_functions
import external_functions
import re
import math
import pandas as pd


app = Flask(__name__)
app.secret_key = 'ironpond_2'

@app.route('/bi_data', methods=['GET','POST'])
def bi_data():
	#data = db_functions.sales()
	if request.method == 'POST':
		#send the form to a dictionary
		send_values = {key:val for key,val in request.form.items()}
		filters = json.loads(send_values['filters']) if 'filters' in send_values else False
		if send_values['visual'] == 'map':
			keys =  external_functions.translate_category_map()
			send_values['category'] = keys[send_values['category']]
		
		#initialize query constructor, with list from ajax request
		query = db_functions.Db_command()
		
		col_array = [val for key,val in send_values.items() if key in ['category','value']]
		col_array = list(set(col_array))
		'date_string' in send_values and col_array.append('OrderDate')

		query.db_rel(col_array,filters)
		data = db_functions.custom_query(query.command,query.joins,query.wheres)

		#set the attributes from the data
		highchart = external_functions.Highcharts(send_values['visual'],send_values['agg_type'])
		highchart.value = send_values['value'] if 'value' in send_values else False
		highchart.category = send_values['category'] if 'category' in send_values else False
		highchart.date_string = send_values['date_string'] if 'date_string' in send_values else False
		
		#create the frame and array.grab the meta data for the html divs.
		new_data = highchart.agg_frame(data)
		new_json = highchart.agg_to_json(new_data)
		
		#remove last cookie, reload it with new attributes
		session['state'] = vars(highchart)
		session['wheres'] = filters
		
		return jsonify(new_json)
		
	elif request.method == 'GET' and 'state' not in session:
		#the stored procedure serves both the meta data, and session requested chart
		data = db_functions.sales()
		
		#html table and pages
		table = external_functions.html_table(data,page=1)
		pages = math.ceil(len(data) / 20)
		
		#get the values for the html data list elements
		category_datalist = external_functions.category_datalist(data)
		num_filters = external_functions.numeric_filters(data)
		
		#plug in the variables
		highchart = external_functions.Highcharts('map','sum',value='Total',category='SupplierCity')

		#for the cookies
		for_next = vars(highchart)
		
		if for_next['visual'] == 'map':
			keys =  external_functions.translate_category_map()
			if 'City' in highchart.category: data = data.rename(columns={highchart.category: keys[highchart.category]}) 
			for_next['category'] = keys[for_next['category']]
		
		#create the frame and json array. meta data and state for html interfacing
		new_data = highchart.agg_frame(data)
		new_json = highchart.agg_to_json(new_data)
		
		if 'point' in "".join(data.columns): data = data.rename(columns={"".join(data.columns[data.columns.str.contains('point')]):highchart.category})
		
		for_feedback = data[data.columns[~data.columns.str.contains('iso|OrderDetailID|lat|lon')]].copy()
		sums = pd.DataFrame(for_feedback[['Total','Quantity']].sum(),columns=['sum']).round(2).astype(str).T.to_dict()
		ranges = pd.DataFrame(for_feedback[['OrderDate','Price']].round(2).astype(str).astype(str).aggregate(['min','max'])).to_dict()
		#numeric_feedback = external_functions.numeric_filters(for_feedback)
		string_feedback = pd.DataFrame(for_feedback.select_dtypes(include=['object']).nunique(),columns=['count']).T.to_dict()
		json_feedback = {**sums, **string_feedback,**ranges} 
		
		preferred = for_feedback.columns.tolist()
		json_feedback = [{'name':i,'values':json_feedback[i]} for i in preferred]
		
		meta_raw = data[data.columns[~data.columns.str.contains('iso|OrderDetailID|lat|lon')]].copy()
	
		#we need metadata for the html elements and save in cookies
		meta_data = [{'name':i[0],'count':int(i[1]),'dtype':i[2].name}   for i in zip(meta_raw.nunique().index,meta_raw.nunique().values,meta_raw.dtypes)]
		meta_data.reverse()
		
		#assign variables to json serializable dictionary
		new_json['state'] = vars(highchart)
		new_json['meta_data'] = meta_data
		new_json['filters'] = category_datalist
		new_json['num_filters'] = num_filters
		new_json['wheres'] = False
		new_json['feedback'] = json_feedback
		new_json['table_data'] = table
		new_json['table_pages'] = pages
		
		#save attributes to cookies
		session['state'] = for_next
		session['wheres'] = False
		new_json['table_pages'] = {'max':pages,'current':1} 
		
		return jsonify(new_json)
		
	elif request.method == 'GET' and 'state' in session:

		#the stored procedure serves both the meta data, and session requested chart
		data = db_functions.sales()
		
		#get the values for the html data list elements
		category_datalist = external_functions.category_datalist(data)
		num_filters = external_functions.numeric_filters(data)
		
		#get the attributes stored in session, send to the class structure. no changes to cookies are made here.
		for_next = session['state']
		
		if for_next['visual'] == 'map':
			keys = external_functions.translate_category_map()
			if 'City' in for_next['category']: data = data.rename(columns={for_next['category']: keys[for_next['category']]}) 
			for_next['category'] = keys[for_next['category']]
		
		highchart = external_functions.Highcharts(**for_next)
		
		if session['wheres']: data = external_functions.frame_filters(data,session['wheres'])
		
		new_data = highchart.agg_frame(data)
		new_json = highchart.agg_to_json(new_data)
		
		if 'point' in "".join(data.columns): data = data.rename(columns={for_next['category']:highchart.category})
		
		#html table with relational spans and pages
		table = external_functions.html_table(data,page=session['table_page'])
		pages = math.ceil(len(data) / 20)
		
		for_feedback = data[data.columns[~data.columns.str.contains('iso|OrderDetailID|lat|lon')]].copy()
		
		sums = pd.DataFrame(for_feedback[['Total','Quantity']].sum(),columns=['sum']).round(2).astype(str).T.to_dict()
		ranges = pd.DataFrame(for_feedback[['OrderDate','Price']].round(2).aggregate(['min','max']).astype(str)).to_dict()
		#numeric_feedback = external_functions.numeric_filters(for_feedback)
		string_feedback = pd.DataFrame(for_feedback.select_dtypes(include=['object']).nunique(),columns=['count']).T.to_dict()
		json_feedback = {**sums, **string_feedback,**ranges} 
		
		preferred = for_feedback.columns.tolist()
		json_feedback = [{'name':i,'values':json_feedback[i]} for i in preferred]
		
		meta_raw = data[data.columns[~data.columns.str.contains('iso|OrderDetailID|lat|lon')]].copy()
		
		#we need metadata for the html elements and save in cookies
		meta_data = [{'name':i[0],'dtype':i[1].name}   for i in zip(meta_raw.nunique().index,meta_raw.dtypes)]
		meta_data.reverse()
		
		#assign variables to json serializable dictionary
		new_json['state'] = vars(highchart)
		new_json['meta_data'] = meta_data
		new_json['filters'] = category_datalist
		new_json['num_filters'] = num_filters
		new_json['wheres'] = session['wheres']
		new_json['feedback'] = json_feedback
		new_json['table_data'] = table
		new_json['table_pages'] = {'max':pages,'current':session['table_page']} 

		return jsonify(new_json)

@app.route("/")
def bi_page():
	#session.pop('state',None)
	#session.pop('wheres',None)
	#session.pop('table_page',None)
	return render_template('index.html')


@app.route("/frame_page/",methods=['POST'])
def ajax_tables():
	#pull data and filter before making the table, no need to update html input attributes
	page_request = {key:val for key,val in request.form.items()}
	data = db_functions.sales()
	if 'filterData' in page_request: data = external_functions.frame_filters(data, json.loads(page_request['filterData']) )
	table = external_functions.html_table(data,page=int(page_request['page']))
	table_feedback = {'table_data':table}
	return jsonify(table_feedback)


@app.route("/frame_filter/",methods=['POST','GET'])
def frame_filter():
	#pull data and filter it
	json_filters = json.loads(request.form['filterData'])
	data = db_functions.sales()
	data = data[data.columns[~data.columns.str.contains('iso|lat|lon')]].copy()
	for_feedback = external_functions.frame_filters(data,json_filters)
	
	#assign page based on available pages and the html table
	pages = math.ceil(len(for_feedback) / 20)
	page = pages if int(request.form['page']) > pages else int(request.form['page'])
	table = external_functions.html_table(for_feedback,page=page)
	
	#this is for the divs showing the data
	sums = pd.DataFrame(for_feedback[['Total','Quantity']].sum(),columns=['sum']).fillna(0).round(2).astype(str).T.to_dict()
	ranges = pd.DataFrame(for_feedback[['OrderDate','Price']].aggregate(['min','max']).fillna(0).round(2).astype(str)).to_dict()
	string_feedback = pd.DataFrame(for_feedback.select_dtypes(include=['object']).nunique(),columns=['count']).T.to_dict()
	json_feedback = {**string_feedback, **sums,**ranges} 
	preferred = for_feedback.columns.tolist()
	filter_feedback = [{'name':i,'values':json_feedback[i]} for i in preferred]
	
	#return everything together
	json_feedback = {'filters':filter_feedback,'table_data':table,'max':pages,'current':page} 
	return jsonify(json_feedback)
	

