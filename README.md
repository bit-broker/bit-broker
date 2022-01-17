# BitBroker

It kinda brokers bits

### Notes

This readme is a __placeholder for now__ and will be fleshed out over time. Specifically, all the old Kalydo documentation at the [internal GitHub](https://cto-github.cisco.com/Team6/kalydo) will be ported here.

For a quick overview you can see the three service definitions at:

* services/coordinator/index.js
* services/contributor/index.js
* services/consumer/index.js

For the underlying details of these, see the corresponding controller objects at:

* lib/controller/*.js

To see example usage models, see the 100s of mocha unit test located at:

* tests/*.js

If you want to run the system locally without k8s, use the script at:

* development/scripts/bbk.sh

### Code Formatting

Use the following options:

```
js-beautify -r -n -u -b collapse,preserve-inline "$@"
```

All code assumes use of ECMAScript 6, runs with 'use strict' on, uses Promise chains not callbacks.

### Dependencies

Please clear all new dependencies with the project team.

### API Style Guidelines

We will align to the Cisco RESTful API Style Guide

https://apistyleguide.cisco.com/  (VPN required)
