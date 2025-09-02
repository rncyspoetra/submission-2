const { Pool } = require('pg');
const { nanoid } = require('nanoid');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');
const { mapDBToModelAlbums } = require('../../utils');
const ClientError = require('../../exceptions/ClientError');

class AlbumsService {
  constructor(cacheService) {
    this._pool = new Pool();

    this._cacheService = cacheService;
  }

  async addAlbum({ name, year }) {
    const id = nanoid(16);
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    const query = {
      text: 'INSERT INTO albums VALUES($1, $2, $3, $4, $5) RETURNING id',
      values: [id, name, year, createdAt, updatedAt],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('Album gagal ditambahkan');
    }

    return result.rows[0].id;
  }

  async getAlbums() {
    const result = await this._pool.query('SELECT * FROM albums');
    return result.rows.map(mapDBToModelAlbums);
  }

  async getAlbumById(id) {
    const queryAlbum = {
      text: 'SELECT * FROM albums WHERE id = $1',
      values: [id],
    };
    const resultAlbum = await this._pool.query(queryAlbum);

    if (!resultAlbum.rows.length) {
      throw new NotFoundError('Album tidak ditemukan');
    }

    const album = mapDBToModelAlbums(resultAlbum.rows[0]);

    const querySong = {
      text: 'SELECT id, title, performer FROM songs WHERE "albumId" = $1',
      values: [id],
    };
    const resultSong = await this._pool.query(querySong);

    return {
      ...album,
      songs: resultSong.rows,
    };
  }

  async editAlbumById(id, { name, year }) {
    const updatedAt = new Date().toISOString();
    const query = {
      text: 'UPDATE albums SET name = $1, year = $2, updated_at = $3 WHERE id = $4 RETURNING id',
      values: [name, year, updatedAt, id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Gagal memperbarui album. Id tidak ditemukan');
    }
  }

  async deleteAlbumById(id) {
    const query = {
      text: 'DELETE FROM albums WHERE id = $1 RETURNING id',
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Album gagal dihapus. Id tidak ditemukan');
    }
  }

  async updateCoverAlbumById(id, coverUrl) {
    const query = {
      text: 'UPDATE albums SET "coverUrl" = $1 WHERE id = $2 RETURNING id',
      values: [coverUrl, id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError(
        'Gagal memperbarui cover album. Id tidak ditemukan'
      );
    }
  }

  async checkAlbum(albumId) {
    const query = {
      text: 'SELECT * FROM albums WHERE id = $1',
      values: [albumId],
    };

    const result = await this._pool.query(query);

    return result.rows.length;
  }

  async checkLike(albumId, credentialId) {
    const query = {
      text: 'SELECT * FROM user_album_likes WHERE album_id = $1 AND user_id = $2',
      values: [albumId, credentialId],
    };

    const result = await this._pool.query(query);

    return result.rows[0];
  }

  async likeAlbum(albumId, credentialId) {
    const checkAlbum = await this.checkAlbum(albumId);

    if (!checkAlbum) {
      throw new NotFoundError('Id tidak ditemukan');
    }

    const checkLike = await this.checkLike(albumId, credentialId);
    if (checkLike) {
      throw new ClientError('Anda Sudah Menyukai Album Ini');
    }

    const id = `likes-${nanoid(16)}`;

    const query = {
      text: 'INSERT INTO user_album_likes VALUES($1, $2, $3) RETURNING id',
      values: [id, credentialId, albumId],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0]) {
      throw new InvariantError('Gagal Menyukai Album');
    }

    await this._cacheService.delete(`likes:${albumId}`);

    return result.rows[0];
  }

  async unlikeAlbum(albumId, credentialId) {
    const query = {
      text: 'DELETE FROM user_album_likes WHERE album_id = $1 AND user_id = $2 RETURNING id',
      values: [albumId, credentialId],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0]) {
      throw new InvariantError('Gagal Membatalkan Suka Pada Album');
    }

    await this._cacheService.delete(`likes:${albumId}`);

    return result.rows[0];
  }

  async getLikesAlbum(albumId) {
    try {
      const result = await this._cacheService.get(`likes:${albumId}`);
      return {
        likes: JSON.parse(result),
        isCache: true,
      };
    } catch (error) {
      const query = {
        text: 'SELECT * FROM user_album_likes WHERE album_id = $1',
        values: [albumId],
      };

      const result = await this._pool.query(query);

      if (!result.rows.length) {
        throw new NotFoundError('Album tidak ditemukan');
      }

      await this._cacheService.set(
        `likes:${albumId}`,
        JSON.stringify(result.rows.length)
      );

      return {
        likes: result.rows.length,
        isCache: false,
      };
    }
  }
}

module.exports = AlbumsService;
