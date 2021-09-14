import pandas as pd
import datetime
import numpy as np

def translate_data(data,column_name,agg_target,agg_type,visual,date_string=False):
	#date requests always have index and column, but no dates have no column
	#level adding for OrderID with subsequent grouping makes sure the values are correct 
	#since the order has OrderDetailID which is a child of OrderID
	if date_string:
		data.index = data.index.strftime(date_string)
		data = pd.pivot_table(data,index=data.index,columns=[column_name,'OrderID'],values=agg_target,aggfunc='sum').groupby(level=0,axis=1).agg(agg_type)
	else:
		data = pd.pivot_table(data,columns=[column_name,'OrderID'],values=agg_target,aggfunc='sum').groupby(level=0,axis=1).agg(agg_type)
	data = data.fillna(0).round(2).sort_index()

	#create a json serializable array which can be read on the highcharts app, with both axis
	series = []
	data = data[data.sum().sort_values(ascending=False).index]
	for i in np.arange(0,len(data.columns)):
		stuff = {'name':data.columns[i],'data':[ round(i,2)  for i in data[data.columns[i]]],'type':visual}
		series.append(stuff)
	
	xAxis = {'categories':[i for i in data.index],'title':data.index.name}
	json_data = {'series':series,'xAxis':xAxis}
	
	return json_data
    

'''

def translate_data(data,date_string,column_name,agg_target,agg_type,visual,accum=False):
	data.index = data.index.strftime(date_string)
	data = pd.pivot_table(data,index=data.index,columns=[column_name],values=agg_target,aggfunc=agg_type).fillna(0)
	
	series = []
	data = data[data.sum().sort_values(ascending=False).index]
	for i in np.arange(0,len(data.columns)):
		stuff = {'name':data.columns[i],'data':[ round(i,2)  for i in data[data.columns[i]]],'type':visual}
		series.append(stuff)
	
	xAxis = {'categories':[i for i in data.index],'title':data.index.name}
	json_data = {'series':series,'xAxis':xAxis}
	
	return json_data
    
'''
