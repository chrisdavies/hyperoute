const hyperoute = require('./hyperoute');

describe('hyperoute', function () {
  it('Does not put hash values in query', function () {
    const route = hyperoute({ stuff: 'test' });

    expect(route('stuff?name=value#baz')).toEqual(['test', { name: 'value' }]);
  });

  it('Has empty params for parameterless routes', function () {
    const route = hyperoute({ stuff: 'test' });

    expect(route('stuff')).toEqual(['test', {}]);
  });

  it('Returns the result of the route', function () {
    const route = hyperoute({
      hi: 'Hello bob',
      bye: 'Bye bob',
    });

    expect(route('hi')[0]).toEqual('Hello bob');
    expect(route('bye')[0]).toEqual('Bye bob');
  });

  it('It handles leading and trailing slashes and 404s', function () {
    const route = hyperoute({
      stuff: 'Yep!',
      '*': 'Nope!',
    });

    expect(route('/stuff/')[0]).toEqual('Yep!');
    expect(route('stuff/')[0]).toEqual('Yep!');
    expect(route('/stuff')[0]).toEqual('Yep!');
    expect(route('stuff')[0]).toEqual('Yep!');
    expect(route('nopes')[0]).toEqual('Nope!');
  });

  it('It handles deep conflicting routes', function () {
    const route = hyperoute({
      'foo/:bar/baz': 'A',
      'foo/:bar/:boo': 'B',
      'foo/bar/bing': 'C',
    });

    expect(route('/foo/babar/baz/')).toEqual(['A', { bar: 'babar' }]);
    expect(route('/foo/x/y/')).toEqual(['B', { bar: 'x', boo: 'y' }]);
    expect(route('/foo/bar/bing/')).toEqual(['C', {}]);
  });

  it('Handles route params', function() {
    const route = hyperoute({
      'hey/:name': 'hello'
    });

    expect(route('hey/chris')).toEqual(['hello', { name: 'chris' }]);
  });

  it('Handles different cases', function() {
    const route = hyperoute({
      'Hey/:name': 'hello',
      'hello/:firstName': 'howdy',
      'hoi/:FirstName/:LastName': 'hola',
    });

    expect(route('hey/chris')).toEqual(['hello', { name: 'chris' }]);
    expect(route('hello/jane')).toEqual(['howdy', { firstName: 'jane' }]);
    expect(route('hoi/Joe/Smith')).toEqual(['hola', { FirstName: 'Joe', LastName: 'Smith' }]);
  });

  it('Matches root routes correctly', function() {
    const route = hyperoute({
      'hey/:name/new': 'new',
      'hey/:name': 'view',
      'hey/:name/edit': 'edit',
    });

    expect(route('hey/chris')[0]).toEqual('view');
  });

  it('Understands specificity', function() {
    const route = hyperoute({
      'hey/joe': 'A',
      'hey/:name': 'B',
      'hey/jane': 'C',
    });

    expect(route('hey/joe')[0]).toEqual('A');
    expect(route('hey/jane')[0]).toEqual('C');
  });

  it('Handles complex routes', function() {
    const route = hyperoute({
      'hey/:name/new': 'A',
      'hey/:name': 'B',
      'hey/:name/last/:last': 'C',
    });

    expect(route('hey/chris/last/davies')).toEqual(['C', { name: 'chris', last: 'davies' }]);
  });

  it('Overrides params with query string values', function() {
    const route = hyperoute({ 'hey/:name/last/:last': 'A' });

    expect(route('hey/chris/last/davies?last=mayo&name=ham')).toEqual(['A', { name: 'ham', last: 'mayo' }]);
  });

  it('Handles not founds', function() {
    const route = hyperoute({
      'hey/:name': 'Yup',
      '*': 'Nope',
    });

    expect(route('hey?hi=there')[0]).toEqual('Nope');
  });

  it('Handles default urls', function() {
    const route = hyperoute({
      '': 'HOME'
    });

    expect(route('')[0]).toEqual('HOME');
  });

  it('Handles multiple params in a row', function() {
    const route = hyperoute({ 'hey/:hello/:world': 'A' });

    expect(route('hey/a/b')).toEqual(['A', { hello: 'a', world: 'b' }]);
  });

  it('Handles trailing slash with query', function() {
    const route = hyperoute({ 'hoi': 'A' });

    expect(route('hoi/?there=yup')).toEqual(['A', { there: 'yup' }]);
  });

  it('Handles leading slashes in defs', function() {
    const route = hyperoute({ '/hoi': 'GOT IT' });

    expect(route('hoi')[0]).toEqual('GOT IT');
  });

  it('Handles hash prefixes', () => {
    const route = hyperoute({ '/users/:name': 'C' });

    expect(route('#/users/chris')).toEqual(['C', { name: 'chris' }]);
  });

  it('Handles wildcard routes', function() {
    const route = hyperoute({
      '/users/:name/baz': 'A',
      '/users/*name': 'B',
      '/foo/:baz/qux': 'C',
      '/foo/*bar': 'D',
      '*': 'NOT FOUND',
    });

    expect(route('hoi')[0]).toEqual('NOT FOUND');
    expect(route('users/chris/baz')).toEqual(['A', { name: 'chris' }]);
    expect(route('users/chris/bar')).toEqual(['B', { name: 'chris/bar' }]);
    expect(route('foo/something/qux')).toEqual(['C', { baz: 'something' }]);
    expect(route('foo/something')).toEqual(['D', { bar: 'something' }]);
  });

  it('Encodes params', function() {
    const route = hyperoute({
      '': 'A',
      ':hey': 'B',
      'more-complex/:hey': 'C',
    });

    expect(route(encodeURIComponent('/hoi/hai?hui'))).toEqual(['B', { hey: '/hoi/hai?hui' }]);
    expect(route(`/?hey=${encodeURIComponent('/what/now')}`)).toEqual(['A', { hey: '/what/now' }]);
    expect(route(`/more-complex/${encodeURIComponent('/hoi/hai?hui')}?hui=${encodeURIComponent('/hoi/hai')}`))
      .toEqual(['C', { hey: '/hoi/hai?hui', hui: '/hoi/hai' }]);
    expect(route(`?${encodeURIComponent('/foo/bar')}=${encodeURIComponent('/baz/')}`))
      .toEqual(['A', { '/foo/bar': '/baz/' }]);
  });
});

function noop() { }
