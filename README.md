# Actional
Let clients pick and choose what to send to each other with Socket.IO

### ⚠️ Warning
This code isnt really all that clean or too useful. This is mainly used for [Taco Bot](https://tacobot.app).  
Also to note: **Namespaces do not work.** For some reason the client would create two sockets (one to the root namespace and another to the defined one) leaving the root namespace socket (that will always be contacted) to not be used by the client.

Features:
- Gather client IDs based on conditions (i.e. `canReachUser`)
- Send events from client to client, allowing you to get and send data from other processes
- CLI for servers `actional-server`

## `actional-server`
Run `actional-server --help` for more info. Arguments are mostly one-to-one with Socket.IO and Actional config.  
Running the command in a directoty with `.actional.json` will use the JSON as a config, otherwise, a config can be defined using `--config`.  
Config files can have every Socket.IO server and Actional option in camel case.
