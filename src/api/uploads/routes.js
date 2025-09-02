const path = require('path');

const routes = (handler) => [
  {
    method: 'POST',
    path: '/albums/{id}/covers',
    handler: handler.postCoverAlbumsHandler,
    options: {
      payload: {
        allow: 'multipart/form-data',
        multipart: true,
        output: 'stream',
        maxBytes: 512000,
      },
    },
  },
  {
    method: 'GET',
    path: '/cover/{param*}',
    handler: {
      directory: {
        path: path.resolve(__dirname, 'upload/images'),
      },
    },
  },
];

module.exports = routes;
