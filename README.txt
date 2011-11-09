JQueryString is a fast QueryString parser for JavaScript.

Is is possible to encode complex expressions 
like "foo[0][bar]=bar&foo[0][baz]=1&foo[]=qrz".

-> { "foo": [ { "bar": "bar", "baz": 1 }, "qrz" }

And it is possible to decode complex object-structures 
to query-strings as well!

This component has no dependencies and defines 
one extra global-variable (called JQueryString)

API:

JQueryString.decode(string, delim = "&")
-> Decodes a query-string to an object.

JQueryString.encode(object, delim = "&")
-> Encodes an object to a query-string.