import Fastify from 'fastify';
import jwtAuthz from './fastify-jwt-authz';

interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
}

describe('fastify-jwt-authz', () => {
  test('should decorate request instance with jwtAuthz method', async () => {
    const fastify = Fastify();
    await fastify.register(jwtAuthz);

    fastify.get('/test', function (request) {
      expect(request).toHaveProperty('jwtAuthz');
      return { foo: 'bar' };
    });

    fastify.listen({ port: 0 }, function () {
      fastify.server.unref();
    });

    const res = await fastify.inject({
      method: 'GET',
      url: '/test'
    });

    expect(res.statusCode).toBe(200);
  });

  test('should throw an error "Scopes cannot be empty" with an empty scopes parameter', async () => {
    const fastify = Fastify();
    await fastify.register(jwtAuthz);

    fastify.get(
      '/test2',
      {
        preHandler: function (request, _reply, done) {
          void request.jwtAuthz([], done);
        }
      },
      function () {
        return { foo: 'bar' };
      }
    );

    fastify.listen({ port: 0 }, function () {
      fastify.server.unref();
    });

    const res = await fastify.inject({
      method: 'GET',
      url: '/test2'
    });
    const resData: ErrorResponse = res.json();

    expect(res.statusCode).toBe(500);
    expect(resData.message).toBe('Scopes cannot be empty');
  });

  test('should throw an error "request.user does not exist" non existing request.user', async () => {
    const fastify = Fastify();
    await fastify.register(jwtAuthz);

    fastify.get(
      '/test3',
      {
        preHandler: function (request, _reply, done) {
          void request.jwtAuthz(['baz'], done);
        }
      },
      function () {
        return { foo: 'bar' };
      }
    );

    fastify.listen({ port: 0 }, function () {
      fastify.server.unref();
    });

    const res = await fastify.inject({
      method: 'GET',
      url: '/test3'
    });
    const resData: ErrorResponse = res.json();

    expect(res.statusCode).toBe(500);
    expect(resData.message).toBe('request.user does not exist');
  });

  test('should throw an error "request.user.scope must be a string"', async () => {
    const fastify = Fastify();
    await fastify.register(jwtAuthz);

    fastify.get(
      '/test4',
      {
        preHandler: function (request, _reply, done) {
          request.user = {
            name: 'sample',
            scope: 123
          };
          void request.jwtAuthz(['baz'], done);
        }
      },
      function () {
        return { foo: 'bar' };
      }
    );

    fastify.listen({ port: 0 }, function () {
      fastify.server.unref();
    });

    const res = await fastify.inject({
      method: 'GET',
      url: '/test4'
    });
    const resData: ErrorResponse = res.json();

    expect(res.statusCode).toBe(500);
    expect(resData.message).toBe('request.user.scope must be a string');
  });

  test('should throw an error "Insufficient scope"', async () => {
    const fastify = Fastify();
    await fastify.register(jwtAuthz);

    fastify.get(
      '/test5',
      {
        preHandler: function (request, _reply, done) {
          request.user = {
            name: 'sample',
            scope: 'baz'
          };
          void request.jwtAuthz(['foo'], done);
        }
      },
      function () {
        return { foo: 'bar' };
      }
    );

    fastify.listen({ port: 0 }, function () {
      fastify.server.unref();
    });

    const res = await fastify.inject({
      method: 'GET',
      url: '/test5'
    });
    const resData: ErrorResponse = res.json();

    expect(res.statusCode).toBe(500);
    expect(resData.message).toBe('Insufficient scope');
  });

  test('should verify user scope', async () => {
    const fastify = Fastify();
    await fastify.register(jwtAuthz);

    fastify.get(
      '/test6',
      {
        preHandler: function (request, _reply, done) {
          request.user = {
            name: 'sample',
            scope: 'user manager'
          };
          void request.jwtAuthz(['user'], done);
        }
      },
      function () {
        return { foo: 'bar' };
      }
    );

    fastify.listen({ port: 0 }, function () {
      fastify.server.unref();
    });

    const res = await fastify.inject({
      method: 'GET',
      url: '/test6'
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ foo: 'bar' });
  });
});
