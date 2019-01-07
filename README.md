# Roll your own primitive runtime for stateless Kafka message transforms

When I deal with JSON my choice of language is Node.js. But with Kafka my choice of language is Java, or in fact [Kafkacat](https://github.com/edenhill/kafkacat/).

Now let's say I need to make a stateless but fairly complex message transform. Declarative transformation won't to, I really need that unit tested functional core of business logic, potentially async.

The promise of serverless is to let me focus on that business logic. I can do that for the transform use case if there's a _runtime_ that lets me write a _handler_ like:

```
module.exports = async function(arg) {
  return await require('./mytransform').statelessTransform(arg);
}
```

This signature is actually compatible with for example [Riff](https://github.com/triggermesh/pipeline-tasks#nodejs-riff-runtime). The contract for the exported function is:

 * It takes a javascript object (deserialized JSON) as the single argument.
 * It returns an array of javascript objects.
 * Upon any error it throws an exception.

Now let's chose a runtime. For an introduction to the idea of runtimes I higly recommend the recent KubeCon keynote [Kubernetes and the Path to Serverless](https://www.youtube.com/watch?v=oNa3xK2GFKY). The handler there reads from stdin and writes to stdout but with Node.js it's a bit easier to export a function, plus it's more likely compatible with runtimes you'll want in Knative where user containers are servers on port 8080.

As the keynote so nicely describes, Kubernetes doesn't offer much flexibility for composition at runtime. Basically containers in pods need to use the network for talking to each other. Often a focus on business logic means not having to deal with networks, so let's instead specify that our business logic is combined with the runtime in a build step. Expressed as Dockerfile syntax:

```
FROM node as my-build
# Do npm install and other preparations here

FROM the-nodejs-runtime
COPY --from=my-build /usr/src/app /usr/src/app
```

We could use a runtime designed for some kind of pubsub, or even [Knative Eventing](https://github.com/knative/eventing) backed by Kafka, but to focus on the principles let's roll our own. Let's ignore performance. What we can never ignore with messaging however is _guarantees_. The runtime should:

 1. Consume a message from a configured source topic.
 2. Load and deserialize the message in Node.js.
 3. Invoke the handler.
 4. Serialize the return values.
 5. _If_ there were no exceptions: write the return values to a configured target topic, ideally as a single transaction so a failure means all failed.
 6. _If_ there were no exceptions _and_ the write was acknowledged: _commit_ the offset of the consumed source message back to Kafka.
 7. _Else_ die, and retry through Kubernetes' container restart principles.
 8. Repeat.

Pardon the parenthesis madness, but there's actually a oneliner with the Node.js CLI to test [a handler](./index.js):

```
node -e '(async function() { process.stdout.write(JSON.stringify(await require("./")({test:true}))); })()'
# prints [{"n":0,"t":"2019-01-05T15:15:15.700Z","arg":{"test":true}}]
```

Ok that's step 3, but how do we do 1 and 2? Kafkacat will easily pipe but with even less code you can read the JSON from a file:

```
echo '{"test":"file"}' > in.json
node -e '(async function() { process.stdout.write(JSON.stringify(await require("./")(require("./in.json")))); })()'
```

Kafkacat will read the next message to a file and then exit, like this:

```
kafkacat -b kafka:9092 -C -t source-json -c 1 -e > in.json
```

Guarantees however require more elaborate consumption.

... but before I got any further on this hack, we did a semi-hack that is more performant (though less guaranteed) over at [Yolean/kafka-transform-nodejs-runtime](https://github.com/Yolean/kafka-transform-nodejs-runtime). See ya.
