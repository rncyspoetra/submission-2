const { Pool } = require('pg');
const { nanoid } = require('nanoid');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');
const AuthorizationError = require('../../exceptions/AuthorizationError');

class PlaylistsService {
  constructor(collaborationService) {
    this._pool = new Pool();
    this._collaborationService = collaborationService;
  }

  async addPlaylist(name, owner) {
    const id = `playlist-${nanoid(16)}`;
    const query = {
      text: 'INSERT INTO playlists VALUES($1, $2, $3) RETURNING id',
      values: [id, name, owner],
    };

    const result = await this._pool.query(query);
    if (!result.rows[0].id) {
      throw new InvariantError('Playlist gagal ditambahkan');
    }
    return result.rows[0].id;
  }

  async addPlaylistSong(playlistId, songId, credentialId) {
    const id = `playlist-song-${nanoid(16)}`;
    const query = {
      text: 'INSERT INTO playlists_songs VALUES($1, $2, $3) RETURNING id',
      values: [id, playlistId, songId],
    };

    const result = await this._pool.query(query);
    if (!result.rows[0].id) {
      throw new InvariantError('Lagu gagal ditambahkan Playlist');
    }

    await this.postActivities(playlistId, songId, credentialId, 'add');
    return result.rows[0].id;
  }

  async getPlaylists(owner) {
    const query = {
      text: `
        SELECT playlists.id, playlists.name, users.username
        FROM playlists
        LEFT JOIN users ON playlists.owner = users.id
        LEFT JOIN collaborations ON collaborations.playlist_id = playlists.id
        WHERE playlists.owner = $1 OR collaborations.user_id = $1
        GROUP BY playlists.id, users.username
      `,
      values: [owner],
    };

    const result = await this._pool.query(query);
    return result.rows;
  }

  async getSongsByPlaylistId(id) {
    const query = {
      text: `
        SELECT songs.id, songs.title, songs.performer
        FROM playlists_songs
        JOIN songs ON songs.id = playlists_songs.song_id
        WHERE playlists_songs.playlist_id = $1
      `,
      values: [id],
    };

    const songsResult = await this._pool.query(query);
    return songsResult.rows;
  }

  async getPlaylistSong(id) {
    const query = {
      text: `
        SELECT playlists.id, playlists.name, users.username
        FROM playlists
        JOIN users ON users.id = playlists.owner
        WHERE playlists.id = $1
      `,
      values: [id],
    };

    const playlist = await this._pool.query(query);
    if (!playlist.rows.length) {
      throw new NotFoundError('Playlist tidak ditemukan');
    }

    const songs = await this.getSongsByPlaylistId(id);
    return {
      playlist: {
        ...playlist.rows[0],
        songs,
      },
    };
  }

  async verifyPlaylistOwner(id, owner) {
    const query = {
      text: 'SELECT * FROM playlists WHERE id = $1',
      values: [id],
    };

    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError('Playlist tidak ditemukan');
    }

    const playlist = result.rows[0];
    if (playlist.owner !== owner) {
      throw new AuthorizationError('Anda tidak berhak mengakses resource ini');
    }
  }

  async verifyPlaylistAccess(playlistId, userId) {
    try {
      await this.verifyPlaylistOwner(playlistId, userId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      try {
        await this._collaborationService.verifyCollaborator(playlistId, userId);
      } catch {
        throw error;
      }
    }
  }

  async deletePlaylistById(id) {
    const query = {
      text: 'DELETE FROM playlists WHERE id = $1 RETURNING id',
      values: [id],
    };

    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError('Playlist gagal dihapus. Id tidak ditemukan');
    }
  }

  async deletePlaylistSong(playlistId, songId, credentialId) {
    const query = {
      text: `
        DELETE FROM playlists_songs
        WHERE playlist_id = $1 AND song_id = $2
        RETURNING id
      `,
      values: [playlistId, songId],
    };

    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError(
        'Lagu dalam playlist gagal dihapus. Id tidak ditemukan'
      );
    }

    await this.postActivities(playlistId, songId, credentialId, 'delete');
  }

  async postActivities(playlistId, song_id, user_id, action) {
    const id = `activities-${nanoid(16)}`;
    const query = {
      text: `
        INSERT INTO playlist_song_activities
        VALUES ($1, $2, $3, $4, $5)
      `,
      values: [id, playlistId, song_id, user_id, action],
    };

    const result = await this._pool.query(query);
    return result.rows;
  }

  async getActivities(playlistId) {
    const query = {
      text: `
        SELECT users.username, songs.title, 
               playlist_song_activities.action, 
               playlist_song_activities.time
        FROM playlist_song_activities
        LEFT JOIN users ON playlist_song_activities.user_id = users.id
        LEFT JOIN songs ON playlist_song_activities.song_id = songs.id
        WHERE playlist_song_activities.playlist_id = $1
        ORDER BY playlist_song_activities.time ASC
      `,
      values: [playlistId],
    };

    const result = await this._pool.query(query);
    return result.rows;
  }
}

module.exports = PlaylistsService;
