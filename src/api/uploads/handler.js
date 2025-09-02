const autoBind = require('auto-bind');
class UploadsHandler {
  constructor(uploadsService, albumsService, validator) {
    this._uploadsService = uploadsService;
    this._albumsService = albumsService;
    this._validator = validator;

    autoBind(this);
  }

  async postCoverAlbumsHandler(request, h) {
    const { cover } = request.payload;
    const { id } = request.params;
    this._validator.validateCoverHeaders(cover.hapi.headers);

    const filename = await this._uploadsService.writeFile(cover, cover.hapi);

    const coverUrl = `http://${process.env.HOST}:${process.env.PORT}/upload/images/${filename}`;

    await this._albumsService.updateCoverAlbumById(id, coverUrl);

    const response = h.response({
      status: 'success',
      message: 'Sampul berhasil diunggah',
    });
    response.code(201);
    return response;
  }
}
module.exports = UploadsHandler;
