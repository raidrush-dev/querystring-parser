/*!
 * QueryString - Standalone query-string parser for JavaScript
 * Copyright 2011 murdoc <murdoc@raidrush.org>
 *
 * This library is free software: you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation, either
 * version 3 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library. If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

var QueryString = (function(undefined) {
  var T_ASSIGN    = 1,
      T_ARR_OPEN  = 2,
      T_ARR_CLOSE = 4,
      T_DELIM     = 8,
      T_STRING    = 16, // stuff between "=" and "&" (delim) or EOF
      T_NUMBER    = 32;
    
  var RE_OPERATOR = /[=\[\]]/,
      RE_NUMBER   = /^[0-9]+$/;
  
  var toString = Object.prototype.toString;
  
  var STRING_TYPE  = toString.call(''),
      OBJECT_TYPE  = toString.call({}),
      ARRAY_TYPE   = toString.call([]),
      NUMBER_TYPE  = toString.call(0),
      BOOLEAN_TYPE = toString.call(true),
      DATE_TYPE    = toString.call(new Date);
  
  // ------------------------
  // tokenizer
  
  var Tokenizer = {
    /**
     * returns the next char of `data`
     *
     * @returns {String}
     */
    next: function next()
    {
      if (this.offs + 1 > this.slen)
        return null;
        
      return this.data.charAt(this.offs++);
    },
    
    /**
     * generates tokens for `data`
     *
     * @param   {String}            data
     * @param   {String|undefined}  delim
     * @returns {Array}
     */
    tokenize: function tokenize(data, delim)
    {
      var tokens = [], token, split = data.split(delim || '&');
      
      for (var i = 0, l = split.length; i < l; ++i) {
        this.data = split[i];
        this.slen = this.data.length;
        this.offs = 0;
        
        while (token = this.next()) {
          switch (token) {
            case '=':
              tokens.push(T_ASSIGN);
              break;
              
            case '[':
              tokens.push(T_ARR_OPEN);
              break;
              
            case ']':
              tokens.push(T_ARR_CLOSE);
              break;
              
            default:
              var value = token;
              
              while (token = this.next()) {
                if (RE_OPERATOR.test(token)) {
                  --this.offs;
                  break;
                }
                
                value += token;
              }
              
              if (RE_NUMBER.test(value))
                tokens.push(T_NUMBER, parseInt(value));
              else
                tokens.push(T_STRING, decodeURIComponent(value));
          }
        }
        
        tokens.push(T_DELIM);
      }
      
      // free memory
      delete this.data, this.slen, this.offs;
      return tokens;
    }
  };
  
  // ------------------------
  // decoder
  
  var Decoder = {
    /**
     * parses the query-string
     *
     * @param   {String}            query
     * @param   {String|undefined}  delim
     * @returns {Object}
     */
    parse: function parse(query, delim)
    {
      this.delim   = delim || '&';
      this.tokens  = Tokenizer.tokenize(query, delim);
      
      var res = {};
      
      // parse AST
      while (this.tokens.length) {
        this.expect(T_STRING);
        
        var name = this.next();
        
        if (typeof res[name] === "undefined")
          res[name] = this.init();
          
        this.collect(res[name], res, name);
      }
      
      return res;
    },
    
    /**
     * collects all properties
     *
     * @param   {Array|Object}    host
     * @param   {Object}          root
     * @param   {String}          key
     */
    collect: function collect(host, root, key)
    {
      var token;
      
      switch (token = this.next()) {
        case T_ARR_OPEN:
          this.access(host);
          break;
          
        case T_ASSIGN:
          this.expect(T_STRING|T_NUMBER);
          root[key] = this.next();
          this.expect(T_DELIM);
          break;
          
        case T_DELIM:
          root[key] = true;
          break;
          
        default:
          throw new Error("Syntax error: unexpected " + this.lookup(token) 
            + ', expected "[", "=" or "' + this.delim + '"');
      }
    },
    
    /**
     * parses access "[" "]" expressions
     *
     * @param   {Array|Object}    host
     */
    access: function access(host)
    {
      var token;
      
      switch (token = this.next()) {
        case T_ARR_CLOSE:
          // alias for push() 
          var key = host.push(this.init()) - 1;
          this.collect(host[key], host, key);
          break;
          
        case T_NUMBER:
          // numeric access
          var index = this.next();
          this.expect(T_ARR_CLOSE);
          
          if (host.length <= index) {
            for (var i = host.length; i < index; ++i)
              host.push(null);
            
            host.push(this.init());
          }
              
          this.collect(host[index], host, index);
          break;
          
        case T_STRING:
          // object access
          var name = this.next();
          this.expect(T_ARR_CLOSE);
          
          if (typeof host[name] == "undefined")
            host[name] = this.init();
          
          this.collect(host[name], host, name);
          break;
          
        default:
          throw new Error("Syntax error: unexpected " + this.lookup(token) 
            + ', expected "]", (number) or (string)');
      }
    },
    
    /**
     * returns the next token without removing it from the stack
     *
     * @return  {Number|String}
     */
    ahead: function ahead(seek)
    {
      return this.tokens[seek || 0];
    },
    
    
    /**
     * looks ahead and returns the type of the next expression
     *
     * @return    {Array|Object}
     */
    init: function init()
    {
      var token;
      
      switch (this.ahead()) {
        case T_ARR_OPEN:
          // we must go deeper *inception*
          switch (token = this.ahead(1)) {
            case T_ARR_CLOSE:
            case T_NUMBER:
              return [];
              
            case T_STRING:
              return {};
              
            default:
              // syntax error
              throw new Error('Syntax error: unexpected ' + this.lookup(token) 
                + ', expecting "]", (number) or (string)');
          }
          
          break;
        
        default:
          return;
      }
    },
    
    /**
     * returns a readable representation of a token-type
     *
     * @param   {Number}    type
     * @returns {String}
     */
    lookup: function lookup(type) 
    {
      switch (type) {
        case T_ASSIGN:
          return '"="';
          
        case T_ARR_OPEN:
          return '"["';
          
        case T_ARR_CLOSE:
          return '"]"';
          
        case T_STRING:
          return '(string)';
          
        case T_NUMBER:
          return '(number)';
          
        case T_DELIM:  
          return '"' + this.delim + '"';
          
        default:
          return '?(' + type + ')?';
      }
    },
    
    /**
     * returns the top-token in stack
     *
     * @returns {Number|String}
     */
    next: function next()
    {
      return this.tokens.length ? this.tokens.shift() : null;
    },
    
    /**
     * validates the next token
     *
     * @throws  {Error}
     * @param   {Number}        tokens
     */
    expect: function expect(tokens)
    {
      if (this.tokens.length && (this.tokens[0] & tokens) === 0) {
        var expecting = [];
        
        for (var i = 0; i <= 32; i += i)
          if (i & tokens !== 0)
            expecting.push(lookup(i));
        
        throw new Error("Syntax error: unexpected " + this.lookup(this.tokens[0]) 
          + ", expecting " + expecting.join(" or "));
      }
      
      if (this.tokens.length) this.tokens.shift();
    }
  };
  
  // ------------------------
  // encoder
  
  var Encoder = {
    /**
     * creates the query-string
     *
     * @param   {Object}            object
     * @param   {String|undefined}  delim
     * @reutrns {String}
     */
    parse: function parse(object, delim)
    {
      this.delim = delim || '&';
      
      var result = [], value;
      
      for (var i in object) {
        if (!object.hasOwnProperty(i))
          continue;
        
        if ((value = this.serialize(object[i], i)) !== "")
          result.push(value);
      }
      
      return result.join(this.delim);
    },
    
    /**
     * serializes the value of the current object
     *
     * @param   {Scalar|Array|Object}   value
     * @param   {String}                label
     * @returns {String}
     */
    serialize: function serialize(value, label)
    {            
      if (typeof value === "undefined" || value === null)
        return "";
        
      switch (toString.call(value)) { 
        case DATE_TYPE:
          return label + "=" + (+value);         
          
        case STRING_TYPE:
          value = this.encode(value);
          
        case NUMBER_TYPE:
          return label + "=" + value;
          
        case BOOLEAN_TYPE:
          return label + "=" + (value ? 1 : 0);
          
        case ARRAY_TYPE:
        case OBJECT_TYPE:
          return this.access(value, label);
        
        default:
          throw new Error('Parse error: value for key "' + label + '" is not serializable');
      }
    },
    
    /**
     * parses arrays and objects
     *
     * @param   {Array|Object}    value
     * @param   {String}          label
     * @reutrns {String}
     */
    access: function access(value, label)
    {
      var result = [];
      
      if (toString.call(value) === ARRAY_TYPE)
        for (var i = 0, l = value.length; i < l; ++i)
          this.handle(result, label, value[i], i);
      else
        for (var i in value)
          if (value.hasOwnProperty(i))
            this.handle(result, label, value[i], i);
            
      return result.join(this.delim);
    },
    
    /**
     * serializes an array/object property
     *
     * @
     */
    handle: function handle(stack, label, value, prop)
    {
      var res;
      
      if ((res = this.serialize(value, label + "[" + prop  + "]")) !== "")
        stack.push(res);
    },
    
    /**
     * uses encodeURIComponent
     *
     * @param   {String}      value
     * @returns {String}
     */
    encode: function encode(value)
    {
      return encodeURIComponent(value);
    }
  };
  
  // ------------------------
  // exports
  
  return {
    /**
     * decodes a query-string
     *
     * @param   {String}            query
     * @param   {String|undefined}  delim
     * @returns {Object}
     */
    decode: function decode(query, delim)
    {
      return Decoder.parse(query, delim);
    },
    
    /**
     * encodes an object 
     *
     * @param   {Object}            object
     * @param   {String|undefined}  delim
     * @returns {String}
     */
    encode: function encode(object, delim) 
    {
      return Encoder.parse(object, delim);
    }
  }
})();