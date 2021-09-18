import pandas as pd
import datetime
import numpy as np

class Highcharts:
	def __init__(highchart,x,y,visual,agg_type=False,date_string=False,title=False):
		highchart.x = x
		highchart.y = y
		highchart.visual = visual
		highchart.agg_type = agg_type
		highchart.date_string = date_string
		highchart.title = title
		
	def frame_for_json(highchart,data):
		if highchart.agg_type:
			grouper = [highchart.x,'OrderID']
			grouper = list(dict.fromkeys(grouper))
			if highchart.date_string:
				data = data.set_index('OrderDate')
				data.index = pd.to_datetime(data.index)
				data.index = data.index.strftime(highchart.date_string)
				data = pd.pivot_table(data,index=data.index,columns=grouper,values=highchart.y,aggfunc='sum').groupby(level=0,axis=1).agg(highchart.agg_type)
				title = '{} {} for {} between {} and {}'
				highchart.title = title.format(highchart.agg_type,highchart.y,highchart.x,data.index[0],data.index[-1])
			else:
				data = pd.pivot_table(data,columns=grouper,values=highchart.y,aggfunc='sum').groupby(level=0,axis=1).agg(highchart.agg_type)
				title = 'sales {} {} for {}'
				highchart.title = title.format(highchart.agg_type,highchart.y,highchart.x)
		else:
			data = data[[highchart.x,highchart.y]].set_index(highchart.x)
			title = 'Correlation between {} and {}'
			highchart.title = title.format(highchart.x,highchart.y)
		
		data = data.fillna(0).round(2).sort_index()
		return data
		
	def frame_to_json(highchart,new_data):
		series = []
		new_data = new_data[new_data.sum().sort_values(ascending=False).index]
		if highchart.visual != 'line':
			for i in np.arange(0,len(new_data.columns)):
				stuff = {'name':str(new_data.columns[i]),'data':[ round(col,2) if col > 0 else 'null' for col in new_data[new_data.columns[i]]]}
				series.append(stuff)
		else:
			for i in np.arange(0,len(new_data.columns)):
				stuff = {'name':str(new_data.columns[i]),'data':[ round(col,2) for col in new_data[new_data.columns[i]]]}
				series.append(stuff)
		
		json_data = {'series':series,'title':highchart.title,'yAxis':{'title':highchart.y},'type':highchart.visual}
		
		if (len(new_data)) > 1:	
			xAxis = {'categories':[i for i in new_data.index],'title': {'text':new_data.index.name}}
			json_data['xAxis'] = xAxis
		else:
			json_data['xAxis'] = {'categories':[highchart.x]}
		#json_data = {'series':series,'xAxis':xAxis,'title':highchart.title,'yAxis':{'title':highchart.y},'type':highchart.visual}
		return json_data

