import pandas as pd
import datetime
import numpy as np

#we offer: 
#1. correlative (x,y axis with category being optional)
#2. time series, with aggregate type 

class Highcharts:
	def __init__(highchart,x,y,visual,chart_type,agg_type=False,date_string=False,title=False,corr_cat=False,check_vals=False):
		highchart.x = x
		highchart.y = y
		highchart.visual = visual
		highchart.chart_type = chart_type
		highchart.agg_type = agg_type
		highchart.date_string = date_string
		highchart.title = title
		highchart.corr_cat = corr_cat
		highchart.check_vals = check_vals
		
	def corr_to_json(highchart,data):
		#boolean list to be used later: checks which axes are numerical
		test = [data.reset_index()[highchart.x].dtype.name,data.reset_index()[highchart.y].dtype.name]
		test = [i not in ['object','datetime64[ns]'] for i in test]
		highchart.check_vals = test
		#if there is correlativate categoy, and both axes are numerical: make a pivot table with top index as column, followed by numerics
		if highchart.corr_cat and all(highchart.check_vals):
			data = pd.pivot_table(data,index=data.index,values=[highchart.x,highchart.y],columns=[highchart.corr_cat]).swaplevel(0, 1, axis=1).sort_index(axis=1)
		elif highchart.corr_cat and not all(highchart.check_vals):
			data = pd.pivot_table(data,columns=highchart.x,index=highchart.y,values=highchart.corr_cat,aggfunc='sum')
		elif all(highchart.check_vals):
			data = data[[highchart.x,highchart.y]].set_index(highchart.x)
		elif any(highchart.check_vals):
			string_axes = [highchart.x,highchart.y][highchart.check_vals.index(False)]
			numerical_axes = [highchart.x,highchart.y][highchart.check_vals.index(True)]
			data = pd.pivot_table(data,columns=[string_axes],values=numerical_axes,index=data.index)
		title = 'Correlation between {} and {}'
		highchart.title = title.format(highchart.x,highchart.y)
		data = data.fillna(0).round(2).sort_index()
		return data

	def frame_for_json(highchart,data):
		if highchart.agg_type:
			grouper = [highchart.x,'OrderID']
			grouper = list(dict.fromkeys(grouper))
			if highchart.date_string:
				if data[highchart.x].dtypes == 'datetime64[ns]':
					data = data.set_index(highchart.x)
					data.index = data.index.strftime(highchart.date_string)
					data = data.groupby(data.index).aggregate({highchart.y:highchart.agg_type})
					title = 'sales {} {} for {}'
					highchart.title = title.format(highchart.agg_type,highchart.y,highchart.x)
				else:
					data = data.set_index('OrderDate')
					data.index = data.index.strftime(highchart.date_string)
					data = pd.pivot_table(data,index=data.index,columns=grouper,values=highchart.y,aggfunc='sum').groupby(level=0,axis=1).agg(highchart.agg_type)
					title = '{} {} for {} between {} and {}'
					highchart.title = title.format(highchart.agg_type,highchart.y,highchart.x,data.index[0],data.index[-1])
			else:
				data = data.groupby(grouper).aggregate({highchart.y:'sum'}).groupby(level=0,axis=0).agg(highchart.agg_type)
				#data = pd.pivot_table(data,columns=grouper,values=highchart.y,aggfunc='sum').groupby(level=0,axis=1).agg(highchart.agg_type)
				title = 'sales {} {} for {}'
				highchart.title = title.format(highchart.agg_type,highchart.y,highchart.x)
		data = data.fillna(0).round(2).sort_index()
		return data

			
		
	def frame_to_json(highchart,new_data):
		series = []
		new_data = new_data[new_data.sum().sort_values(ascending=False).index]
		if highchart.chart_type == 'correlation':
			#during a categorical correlation, both axes must be numeric, so it's assumed. control to be handled from interface
			if highchart.corr_cat and all(highchart.check_vals):
				for i in new_data.columns.levels[0]:
					stuff = {'name':i ,'data':[[x[0],x[1]] for x in new_data[i][[highchart.x,highchart.y]].values if x[0] > 0 and x[1] >0]}
					series.append(stuff)
				json_data = {'series':series,'title':highchart.title,'type':highchart.visual,'xAxis':{'title':{'text':highchart.x}},'yAxis':{'title':{'text':highchart.y}}}
			#correlative with strings as axes, correlation category is numeric
			elif highchart.corr_cat and not all(highchart.check_vals):
				for i in np.arange(0,len(new_data.columns)):
					stuff = {'name':str(new_data.columns[i]),'data':[[int(i),int(s[0])] for s in enumerate(new_data[new_data.columns[i]]) if s[1] > 0 ]}
					series.append(stuff)
				print(new_data.index)
				xAxis = {'title':{'text':highchart.x},'categories':[i for i in new_data.columns]}
				yAxis = {'title':{'text':highchart.y},'categories':[i for i in new_data.index]}
				json_data = {'series':series,'title':highchart.title,'type':highchart.visual,'yAxis':yAxis,'xAxis':xAxis}	
			#normal correlation
			elif all(highchart.check_vals):
				for i in np.arange(0,len(new_data.columns)):
					stuff = {'name':'{} vs {}'.format(highchart.x,highchart.y),'data':[ [i[0],i[1]] for i in new_data.reset_index().values]}
					series.append(stuff)
				json_data = {'series':series,'title':highchart.title,'type':highchart.visual,'yAxis':{'title':{'text':highchart.y}},'xAxis':{'title':{'text':highchart.x}}}
				
			#if one of the axes is string, then we calculate depending on the axes data type
			elif any(highchart.check_vals):
				if highchart.check_vals[0] == False:
					for s,i in enumerate(new_data.columns):
						stuff = {'name':i}
						temp = [[s,x] for x in new_data[i].values if x > 0]
						stuff['data']= temp
						series.append(stuff)
						yAxis = {'title':{'text':highchart.y}}
						xAxis = {'title':{'text':highchart.x},'categories':[i for i in new_data.columns]}
				elif highchart.check_vals[1] == False:
					for s,i in enumerate(new_data.columns):
						stuff = {'name':i}
						temp = [[x,s] for x in new_data[i].values if x > 0]
						stuff['data']= temp
						series.append(stuff)
						yAxis = {'title':{'text':highchart.y},'categories':[i for i in new_data.T.index]}
						xAxis = {'title':{'text':highchart.x}}
				json_data = {'series':series,'title':highchart.title,'type':highchart.visual,'yAxis':yAxis,'xAxis':xAxis}
		else: 
			for i in np.arange(0,len(new_data.columns)):
				stuff = {'name':str(new_data.columns[i]),'data':[ round(col,2) for col in new_data[new_data.columns[i]]]}
				series.append(stuff)
		
			json_data = {'series':series,'title':highchart.title,'yAxis':{'title':highchart.y},'type':highchart.visual}
			xAxis = {'categories':[i for i in new_data.index],'title': {'text':new_data.index.name}}
			json_data['xAxis'] = xAxis

		return json_data

'''
#print(string_axes,numerical_axes)
			
		
			if highchart.check_vals[0] == False:
				data = pd.pivot_table(data,columns=[highchart.x],values=highchart.y,index=data.index)
			elif highchart.check_vals[1] == False:
		

for s,i in enumerate(new_data.columns):
					stuff = {'name':i}
					if highchart.check_vals[0] == False:
						temp = [[s,x] for x in new_data[i].values if x > 0]
						#xAxis = {'categories':[i for i in new_data.columns]}
					elif highchart.check_vals[1] == False:
						temp = [[x,s] for x in new_data[i].values if x > 0]
						#xAxis = {'categories':[i for i in new_data.columns]}
					stuff['data']= temp
					series.append(stuff)



#if (len(new_data)) > 1 and highchart.corr_cat == False and new_data.index.dtype == 'object':	
		#	xAxis = {'categories':[i for i in new_data.index],'title': {'text':new_data.index.name}}
		#	json_data['xAxis'] = xAxis
		#else:
		#	json_data['xAxis'] = {'categories':[highchart.x]}
		#json_data = {'series':series,'xAxis':xAxis,'title':highchart.title,'yAxis':{'title':highchart.y},'type':highchart.visual}			
'''
