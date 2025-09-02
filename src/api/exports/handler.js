const autoBind = require('auto-bind');

class ExportsHandler {
  constructor(producerService, playlistsService, validator) {
    this._producerService = producerService;
    this._playlistsService = playlistsService;
    this._validator = validator;

    autoBind(this);
  }

  async postExportPlaylistsHandler(request, h) {
    this._validator.validateExportPlaylistsPayload(request.payload);

    const { id } = request.auth.credentials;
    const { playlistId } = request.params;
    const { targetEmail } = request.payload;

    await this._playlistsService.verifyPlaylistAccess(playlistId, id);

    const message = {
      playlistId,
      targetEmail,
    };

    await this._producerService.sendMessage(
      'export:playlists',
      JSON.stringify(message)
    );

    const response = h.response({
      status: 'success',
      message: 'Permintaan Anda dalam antrean',
    });
    response.code(201);
    return response;
  }
}

module.exports = ExportsHandler;
