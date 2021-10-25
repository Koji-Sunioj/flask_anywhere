import pandas as pd
import datetime
import numpy as np
import matplotlib
from matplotlib import cm
import re

class Highcharts:
	def __init__(highchart,visual,agg_type,value=False,category=False,date_string=False,title=False):	
		highchart.value = value
		highchart.visual = visual
		highchart.agg_type = agg_type
		highchart.category = category
		highchart.date_string = date_string
		highchart.title = title

	def regex_labels(highchart,label):
		#regex splitting of column strings for html rendering
		new_label = re.split("([A-Z][a-z]+|[A-Z][A-Z]+)", label)
		new_label = [word for word in  new_label if word]
		new_label = " ".join(new_label)
		return new_label

	def color_gradient(highchart,bins):
		#create a gradient of color depending on bins
		cmap = cm.get_cmap('coolwarm',len(bins)) 
		colors = []
		for i in range(cmap.N):
			rgba = cmap(i)
			colors.append(matplotlib.colors.rgb2hex(rgba))
		return colors
		

	def handle_title(highchart,date_index=False):
		#create the highchart title
		label = 'Count' if highchart.agg_type == 'nunique' else  'Euro ' + highchart.agg_type.title()
		label = 'Sales Order ' + label
		label = label + ' per ' + highchart.regex_labels(highchart.category).title() if highchart.category else label
		label = label + ': between {} and {}'.format(date_index[0],date_index[-1]) if highchart.date_string and len(date_index) > 1 else label
		return label
			
	
	def agg_frame(highchart,data):
		#grouping revolves around OrderID for sales view
		grouper = [highchart.category,'OrderID']
		grouper = list(dict.fromkeys(grouper))
		grouper = [i for i in grouper if i]
		values = highchart.value if highchart.value and highchart.agg_type != 'nunique' else 'OrderID'
		
		#if date string is requested
		if highchart.date_string:
			data['OrderDate'] = pd.to_datetime(data['OrderDate'])
			data = data.set_index('OrderDate')
			data.index = data.index.strftime(highchart.date_string)
			grouper.insert(0,'OrderDate')
			columns = highchart.category if highchart.category else None
			if highchart.value and highchart.value != 'Price':
				data = data.groupby(grouper).aggregate({highchart.value:'sum'}).reset_index()
			data = pd.pivot_table(data,index='OrderDate',columns=columns,values=values,aggfunc=highchart.agg_type)
			unique_or = 'count' if  highchart.agg_type == 'nunique' else highchart.agg_type
			data.columns = [unique_or] if len(data.columns) == 1 else data.columns
			data = data.sort_index()
			highchart.title = '{}'.format(highchart.handle_title(data.index))
			
		#no date string, normal aggregate
		elif highchart.date_string == False:
			if highchart.value and highchart.value != 'Price':
				data = data.groupby(grouper).aggregate({highchart.value:'sum'}).reset_index()
			data = data.groupby(highchart.category) if highchart.category else data
			data = data.aggregate({values:highchart.agg_type})
			data = pd.DataFrame(data) if len(data) == 1 and type(data).__name__ == 'Series' else data
			data.columns = [highchart.agg_type]  if highchart.agg_type != 'nunique' else ['count']
			highchart.title = '{}'.format(highchart.handle_title())
			
		data = data.fillna(0).round(2).sort_index()
		print(data)
		return data

	def agg_to_json(highchart,new_data):
		#series list is the array highcharts will interact with
		series = []
		
		#if there is one column, sort the values of the numerical column
		if len(new_data.columns) == 1 and highchart.date_string == False:
			new_data = new_data.sort_values(new_data.columns[0])
		
		#sort the columns according to whichever columns has the highest aggregate total
		else:
			new_data = new_data[new_data.sum().sort_values(ascending=False).index]
		
		if highchart.visual == 'map':
			stuff = {'name':highchart.category,'data':[[country.lower(),value[0].round(2)] for country,value in zip(new_data.index,new_data.values)]}
			series.append(stuff)
		elif highchart.visual != 'map':
			for i in np.arange(0,len(new_data.columns)):
				stuff = {'name':str(new_data.columns[i]),'data':[round(col,2) for col in new_data[new_data.columns[i]] ]}
				series.append(stuff)
		

		y_label = 'count' if highchart.agg_type == 'nunique' else highchart.value
		json_data = {'series':series,'title':highchart.title,'yAxis':{'title': {'text':y_label.title()}},'type':highchart.visual}
		
		x_label = 'OrderDate' if highchart.date_string else highchart.category
		x_label = 'Orders' if x_label == False else highchart.regex_labels(x_label)
		categories = [i for i in new_data.index ] if len(new_data.index) > 1 else ['']
		
		xAxis = {'categories':categories,'title': {'text':x_label}}
		
		json_data['xAxis'] = xAxis
		print(json_data)
		return json_data

'''

'''
