class PlaylistsHandler {
  constructor(playlistsService, songsService, validator) {
    this._songsService = songsService;
    this._playListService = playlistsService;
    this._validator = validator;
    this.postPlaylistHandler = this.postPlaylistHandler.bind(this);
    this.getPlaylistsHandler = this.getPlaylistsHandler.bind(this);
    this.deletePlaylistByIdHandler = this.deletePlaylistByIdHandler.bind(this);
    this.postPlaylistSongHandler = this.postPlaylistSongHandler.bind(this);
    this.getPlaylistSongHandler = this.getPlaylistSongHandler.bind(this);
    this.deletePlaylistSongHandler = this.deletePlaylistSongHandler.bind(this);
    this.getActivitiesHandler = this.getActivitiesHandler.bind(this);
  }

  async postPlaylistHandler(request, h) {
    this._validator.validatePostPlaylistPayload(request.payload);
    const { name } = request.payload;
    const { id: credentialId } = request.auth.credentials;

    const playlistId = await this._playListService.addPlaylist(
      name,
      credentialId
    );

    const response = h.response({ status: 'success', data: { playlistId } });
    response.code(201);
    return response;
  }

  async getPlaylistsHandler(request, h) {
    const { id: credentialId } = request.auth.credentials;

    const playlists = await this._playListService.getPlaylists(credentialId);

    const result = { status: 'success', data: { playlists: playlists } };
    return result;
  }

  async deletePlaylistByIdHandler(request, h) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;

    await this._playListService.verifyPlaylistOwner(id, credentialId);
    await this._playListService.deletePlaylistById(id);

    return { status: 'success', message: 'Playlist berhasil dihapus' };
  }

  async postPlaylistSongHandler(request, h) {
    this._validator.validatePostPlaylistSongPayload(request.payload);

    const { id: playlistId } = request.params;
    const { songId } = request.payload;
    const { id: credentialId } = request.auth.credentials;

    await this._songsService.getSongById(songId);
    await this._playListService.verifyPlaylistAccess(playlistId, credentialId);

    const playlistSongId = await this._playListService.addPlaylistSong(
      playlistId,
      songId,
      credentialId
    );

    const response = h.response({
      status: 'success',
      message: 'Lagu berhasil ditambahkan ke playlist',
    });
    response.code(201);
    return response;
  }

  async getPlaylistSongHandler(request, h) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;

    await this._playListService.verifyPlaylistAccess(id, credentialId);
    const playlistSong = await this._playListService.getPlaylistSong(id);

    return { status: 'success', data: playlistSong };
  }

  async deletePlaylistSongHandler(request, h) {
    this._validator.validateDeletePlaylistSongPayload(request.payload);

    const { songId } = request.payload;
    const { id: playlistId } = request.params;
    const { id: credentialId } = request.auth.credentials;

    await this._playListService.verifyPlaylistAccess(playlistId, credentialId);
    await this._playListService.deletePlaylistSong(
      playlistId,
      songId,
      credentialId
    );
    return {
      status: 'success',
      message: 'Lagu berhasil dihapus dari playlist',
    };
  }

  async getActivitiesHandler(request, h) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;

    await this._playListService.verifyPlaylistAccess(id, credentialId);
    const activitiesPlaylist = await this._playListService.getActivities(id);

    const response = h.response({
      status: 'success',
      playlistId: id,
      activities: activitiesPlaylist,
    });
    response.code(200);
    return response;
  }
}
module.exports = PlaylistsHandler;
