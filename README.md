# hyperoute

A small, fast router with zero dependencies.

- Order of route declaration doesn't matter: the most specific route wins
- Zero dependencies
- No performance drop as you add routes
- Less than 600 bytes minified and gzipped
- Parses query strings
- Wildcard support

This is based loosely on [rlite](https://github.com/chrisdavies/rlite) but with a focus on a hyperapp-friendly API.

## Installation

`npm install --save hyperoute`

## Usage

Hyperoute does not hook into any browser events, but it's pretty trivial to wire it up:

```js
import hyperoute from 'hyperoute';

const route = hyperoute({
  // route('/') -> ['Home', {}]
  '': 'Home',
  // route('/inbox?to=jamesearljones') -> ['Inbox', { to: 'jamesearljones' }]
  'inbox': 'Inbox',
  // route('/sent/') -> ['Sent', {}]
  'sent': 'Sent',
  // route('users/jimbo') -> ['ViewUser', { name: 'jimbo' }]
  'users/:name': 'ViewUser',
  // route('users/dabo/swinney) -> ['SubUser', { path: 'dabo/swinney' }]
  'users/*path': 'SubUser',
  // route('boogers') -> ['NotFound', { url: 'boogers' }]
  '*url': 'NotFound',
});

// Hash-based routing
function processHash() {
  document.body.textContent = JSON.stringify(route(location.hash));
}

window.addEventListener('hashchange', processHash);
processHash();
```

The previous examples should be relatively self-explantatory. Simple, parameterized routes are supported. Only relative URLs are supported. (So, instead of passing: `'http://example.com/users/1'`, pass `'/users/1'`).

Routes are not case sensitive, so `'Users/:name'` will resolve to `'users/:name'`

## Possible surprises

If there is a query parameter with the same name as a route parameter, it will override the route parameter. So given the following route definition:

    /users/:name

If you pass the following URL:

    /users/chris?name=joe

The value of params.name will be 'joe', not 'chris'.

Keywords/patterns need to immediately follow a slash. So, routes like the following will not be matched:

    /users/user-:id

In this case, you'll need to either use a wildcard route `/users/*prefixedId` or else, you'd want to modify the URL to be in a format like this: `/users/user/:id`.


## Contributing

Make your changes (and add tests), then run the tests:

    npm test

If all is well, build your changes:

    npm run build

This minifies hyperoute, and tells you the size. It's currently well under 600 bytes, and I'd like to keep it that way!


## Usage with Hyperapp

Hyperoute was designed for use with [hyperapp](https://github.com/JorgeBucaran/hyperapp). Here's an example of how that might be done:

```js
import hyperoute from 'hyperoute';
import { h, app } from 'https://unpkg.com/hyperapp';

const route = hyperoute({
  '': state => ({ ...state, message: 'Home' }),
  '/users': state => ({ ...state, message: 'Users' }),
  '/users/:name': (state, { name }) => ({ ...state, message: `Hello, ${name}` }),
  '*url': (state, { url }) => ({ ...state, message: `404! ${url}` }),
});

// This is a hyperapp subscription which wires up the router to the
// window's url change events as well as to hyperapp's dispatch.
const Router = dispatch => {
  const hashChange = () => dispatch(route(window.location.hash));

  window.addEventListener('hashchange', hashChange);

  // The setTimout prevents an infinite loop...
  setTimeout(hashChange);

  return () => window.removeEventListener('hashchange', hashChange);
};

app({
  init: { message: 'Loading...' },
  view: state =>
    h('div', {}, [
      h('h1', {}, state.message),
    ]),
  subscriptions: () => [Router],
  node: document.getElementById('app'),
});
```

## License MIT

Copyright (c) 2016 Chris Davies

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
