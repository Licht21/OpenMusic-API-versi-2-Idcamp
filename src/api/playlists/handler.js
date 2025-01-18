/* eslint-disable no-underscore-dangle */
const autoBind = require('auto-bind');

class PlaylistsHandler {
  constructor(service, validator) {
    this._service = service;
    this._validator = validator;

    autoBind(this);
  }

  async postPlaylistHandler(request, h) {
    this._validator.validatePostPlaylistPayload(request.payload);

    const { name: playlistName } = request.payload;
    const { id: credentialId } = request.auth.credentials;

    const playlistId = await this._service.addPlaylist(playlistName, credentialId);

    return h.response({
      status: 'success',
      data: {
        playlistId,
      },
    }).code(201);
  }

  async deletePlaylistHandler(request, h) {
    const { id: credentialId } = request.auth.credential;
    const { id: playlistId } = request.params;

    await this._service.verifyPlaylistOwner(playlistId, credentialId);
    await this._service.deletePlaylist(playlistId);

    return h.response({
      status: 'success',
      message: 'Berhasil menghapus playlist',
    }).code(200);
  }
}

module.exports = PlaylistsHandler;
