const routes = (handler) => [
  {
    method: 'POST',
    path: '/playlists',
    handler: handler.postPlaylistHandler,
    options: {
      auth: 'openmusic_jwt',
    },
  },
  {
    method: 'DELETE',
    path: '/playlists',
    handler: handler.deletePlaylistHandler,
    options: {
      auth: 'openmusic_jwt',
    },
  },
];

module.exports = routes;
