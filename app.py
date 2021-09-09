# -*- coding: utf-8 -*-
from flask import Flask, redirect, url_for, request,json,session,render_template,jsonify
from werkzeug.utils import secure_filename
import re
import datetime
import pandas as pd
import numpy as np
import json
import requests
import pymysql
from flask import Flask


app = Flask(__name__)
app.secret_key = 'ironpond_2'

@app.route("/")
def hello_world():
	return "<p>Hello, World!</p>" 

if (__name__ == "__main__"):
	app.run(port = 5000, debug=True)
