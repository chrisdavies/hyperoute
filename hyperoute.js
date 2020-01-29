/**
 * Hyperoute takes a map of route-pattern -> handler-value and converts it into a relatively
 * efficient search structure.
 *
 * For example, the following definition:
 * 
 * {
 *   'greetings/earthling': 'Mars',
 *   'hello/:title/:age': 'Hi',
 *   'users/:userId': 'ViewUser',
 *   'users/:userId/comments': 'UserComments',
 *   '*url': '404',
 * }
 *
 * Produces this tree:
 *
 *  {
 *    "greetings": {
 *      "earthlings": {
 *        "#handler": "Mars"
 *      },
 *    },
 *    "hello": {
 *      ":": {
 *        "#name": "title",
 *        ":": {
 *          "#name": "age",
 *          "#handler": "Hi"
 *        }
 *      }
 *    },
 *    "users": {
 *      ":": {
 *        "#name": "userId",
 *        "#handler": "ViewUser",
 *        "comments": {
 *          "#handler": "UserComments"
 *        }
 *      }
 *    },
 *    "*": {
 *      "#name": "url",
 *      "#handler": "404"
 *    }
 *  }
 *
 * When a url is passed to the route function, we search that tree
 * for a match. If a url terminates in a leaf of this tree, we return
 * whatever value is in the `#handler` property of the leaf node. When
 * we see a `#name` property in a node that we are visiting, we store
 * the name + the value of the url piece in an array to be later converted
 * into our params map.
 */

// The key for storing the name of a route parameter
const nameKey = '#name';

// The key for storing the handler of a matched route
const handlerKey = '#handler';

function addRoute(rules, urlPieces, handler) {
  for (let i in urlPieces) {
    const piece = urlPieces[i];
    const prefix = piece[0];
    const isNamedPiece = prefix === ':' || prefix === '*';
    const name = isNamedPiece ? prefix : piece.toLowerCase();
    const rule = rules[name] || {};
    rules[name] = rule;

    isNamedPiece && (rule[nameKey] = piece.slice(1));

    rules = rule;
  }

  rules[handlerKey] = handler;
}

function urlSplit(url) {
  return url.split(/[\#\/]/).filter(function (s) { return !!s; });
}

/**
 * Walks the routes tree to find a matching route. One of the more peculiar
 * bits of this is the way we handle params. Params is an array of key value
 * pairs (an array of arrays).
 *
 * As we walk the tree, if we come across a node that has a `#name` property,
 * we add a key value pair to the params. For example, let's say we have a
 * route like `hello/:title/:age` and we are matching this url: `hello/oldfart/120`,
 * the params array will end up looking like this: `[['title', 'oldfart'], ['age', '120']]`.
 *
 * The reason we store params as an array instead of as a map is so that
 * we don't have to use the spread / Object.assign functionality which doesn't
 * exist in certain crusty old browsers. The array approach is also slightly
 * faster. We do mutate the array, but the mutations are additive.
 */
function lookup(routes, urlPieces, i, params) {
  if (!routes) {
    return;
  }

  if (i >= urlPieces.length) {
    return routes[handlerKey] && [routes[handlerKey], params.reduce(function (acc, kv) {
      acc[kv[0]] = kv[1];
      return acc;
    }, {})];
  }

  const piece = urlPieces[i];
  const paramLen = params.length;

  // First, attempt to find a route which has an exact match for our piece
  // e.g. the `/hello/world` route would exactly match the `/hello/world` url.
  return lookup(routes[piece], urlPieces, i + 1, params)
    // No exact match was found, so now see if there's a named match
    // e.g. the `/hello/:youguys` route would match the `/hello/world` url
    || lookupName(piece, paramLen, routes[':'], urlPieces, i + 1, params)
    // There's no named match, so finally check to see if there's a wildcard match
    // e.g. the `/hello/*stuff` route would match the `/hello/world` url.
    || lookupName(urlPieces.slice(i).join('/'), paramLen, routes['*'], urlPieces, urlPieces.length, params);
}

function lookupName(val, paramLen, routes, urlPieces, i, params) {
  // Sometimes, we may go down a dead end in looking for a match, and then we
  // back out and fall into a more general match. In such cases, params may have
  // cruft which doesn't match our final route. That's why we reset the params
  // array here.
  //
  // For example, let's say we had the following 2 routes defined:
  // '/users/:userId/:petId' and '/users/:userId/*rest'
  //
  // Let's say that we're processing this url:
  // `/users/42/comments/nsuch`
  //
  // We end up first visiting the more specific route: '/users/:userId/:petId',
  // which makes params temporarily look like this:
  // `[['userId', '42'], ['petId', 'comments']]`
  //
  // When we fall back to the more general route: '/users/:userId/*rest'
  // we need to reset the params array to only contain the params in common
  // with our new route. That's what this line is doing.
  params.length = paramLen;

  if (routes) {
    const name = routes[nameKey];
    name && params.push([name, decodeURIComponent(val)]);
    return lookup(routes, urlPieces, i, params);
  }
}

function processQuery(query, params) {
  return query.split('#')[0].split('&')
    .map(function (s) { return s.split('='); })
    .reduce(function (acc, kv) {
      acc[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1]);
      return acc;
    }, params);
}

module.exports = function hyperoute(routeDefinitions) {
  // Build the route tree
  const routes = Object.keys(routeDefinitions).reduce(function (acc, key) {
    addRoute(acc, urlSplit(key), routeDefinitions[key]);
    return acc;
  }, {});

  return function route(url) {
    const querySplit = url.split('?');
    const urlPieces = urlSplit(querySplit[0]);
    const result = lookup(routes, urlPieces, 0, []);
    const queryStr = querySplit[1];

    return queryStr ? [result[0], processQuery(querySplit[1], result[1])] : result;
  };
}
