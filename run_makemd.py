content = '''
## Hello
This is a test

## Just to see
If this works
'''

with open('dist/docs/Reference/test.md','w') as f:
    lines = f.write(content)