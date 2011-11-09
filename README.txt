QueryString is a fast QueryString parser for JavaScript.

Is is possible to decode complex expressions 
like "foo[0][bar]=bar&foo[0][baz]=1&foo[]=qrz".

example:
--------------------------------------------------------------------
var query = "foo[1][foo][][2]=1&bar=1";

QueryString.decode(query);
// -> { "foo": [ null, { "foo": [ [ null, null, 1] ] } ], "bar": 1 }
--------------------------------------------------------------------

And it is possible to encode complex object-structures 
to query-strings as well!

example:
--------------------------------------------------------------------
var obj = { foo: [ { "bar": [ 1, 2, { "bar": 1 } ] } ] };

QueryString.encode(obj);
// -> foo[0][bar][0]=1&foo[0][bar][1]=2&foo[0][bar][2][bar]=1
--------------------------------------------------------------------

This component has no dependencies and defines 
one extra global-variable (called QueryString)

API:

QueryString.decode(string, delim = "&")
-> Decodes a query-string to an object.

QueryString.encode(object, delim = "&")
-> Encodes an object to a query-string.