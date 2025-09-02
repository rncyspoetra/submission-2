exports.up = (pgm) => {
  pgm.addColumn('albums', {
    coverUrl: {
      type: 'TEXT',
      notNull: false,
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('albums', 'coverUrl');
};
