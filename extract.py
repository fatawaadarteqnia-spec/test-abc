#!/usr/bin/env python3
import zipfile
import os

# Extract the zip file
with zipfile.ZipFile('pixel-sanctuary.zip', 'r') as zip_ref:
    zip_ref.extractall('.')

print("Extraction completed")
