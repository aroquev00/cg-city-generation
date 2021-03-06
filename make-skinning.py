import os
import glob
from distutils.dir_util import copy_tree
import shutil

srcfiles = glob.glob('./src/skinning/*.ts')
city_srcfiles = glob.glob('./src/cityGeneration/*.ts')
loaders = glob.glob('./src/lib/threejs/examples/jsm/loaders/*.js')
cmd = 'tsc --allowJs -m ES6 -t ES6 --outDir dist --sourceMap --alwaysStrict ' + " ".join(srcfiles) + ' ' + " ".join(city_srcfiles) + ' ./src/lib/vue/vue.js ' + " ".join(loaders)
print('Building TypeScript: ' + cmd)
os.system(cmd)
copy_tree('./src/skinning/static', './dist')
copy_tree('./src/cityGeneration/static', './dist/static')
