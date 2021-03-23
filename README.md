# BitBroker

It kinda brokers bits

This readme will be fleshed out over time. For now we can use it to gather ad hoc development notes.

### Paths

You can set the following paths as environment variables - use absolute or relative paths. If you use the default project directory layout, then just ignore this and set nothing.

```
PATH_LOCALES - defaults to '../locales'
PATH_LIB - defaults to '../lib';
PATH_CONFIG - defaults to '..';
```

### Code Formatting

Use the following script:

```
#!/bin/bash
js-beautify -r -n -u -b collapse,preserve-inline "$@"
```


### API Style Guidelines

We will align to the Cisco RESTful API Style Guide

https://apistyleguide.cisco.com/  (VPN required)
