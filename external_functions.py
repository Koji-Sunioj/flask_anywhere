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
			data = data.groupby(grouper).aggregate({highchart.value:'sum'}).reset_index() if highchart.value else data
			data = pd.pivot_table(data,index='OrderDate',columns=columns,values=values,aggfunc=highchart.agg_type)
			data = data.sort_index()
			
		#no date string, normal aggregate
		elif highchart.date_string == False:
			data = data.groupby(grouper).aggregate({highchart.value:'sum'}).reset_index() if highchart.value else data
			data = data.groupby(highchart.category) if highchart.category else data
			data = data.aggregate({values:highchart.agg_type})
			data = pd.DataFrame(data) if len(data) == 1 and type(data).__name__ == 'Series' else data
			data.index = [highchart.agg_type] if len(data) == 1 and type(data).__name__ == 'Series' else data.index
			
		data = data.fillna(0).round(2).sort_index()
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
		for i in np.arange(0,len(new_data.columns)):
			stuff = {'name':str(new_data.columns[i]),'data':[round(col,2) for col in new_data[new_data.columns[i]] ]}
			series.append(stuff)
		
		json_data = {'series':series,'title':highchart.title,'yAxis':{'title':highchart.category},'type':highchart.visual}
		xAxis = {'categories':[i for i in new_data.index],'title': {'text':new_data.index.name,'style':{'fontSize':'2px'}}}
		json_data['xAxis'] = xAxis
		return json_data

'''

'''
