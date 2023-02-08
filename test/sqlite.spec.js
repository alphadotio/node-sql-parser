const { expect } = require('chai');
const Parser = require('../src/parser').default

describe('sqlite', () => {
  const parser = new Parser();

  function getParsedSql(sql, opt = { database: 'sqlite' }) {
    const ast = parser.astify(sql, opt);
    return parser.sqlify(ast, opt);
  }

  it('should support analyze', () => {
    const sql = 'analyze schemaName.tableName'
    expect(getParsedSql(sql)).to.be.equal('ANALYZE `schemaName`.`tableName`')
  })

  it('should support attach', () => {
    const sql = "attach database 'c:\sqlite\db\contacts.db' as contacts;"
    expect(getParsedSql(sql)).to.be.equal("ATTACH DATABASE 'c:\sqlite\db\contacts.db' AS `contacts`")
  })

  it('should support json function in from clause', () => {
    const sql = `SELECT json_extract(value, '$.id') AS author_id
    FROM
        post,
        json_each(post.author, '$')
    GROUP BY
        author_id;`
    expect(getParsedSql(sql)).to.be.equal("SELECT json_extract(`value`, '$.id') AS `author_id` FROM `post`, json_each(`post`.`author`, '$') GROUP BY `author_id`")
  })

  it('should support || in where clause', () => {
    const sql = `SELECT *
    FROM
        pets
        LEFT JOIN(
            SELECT * FROM user
            WHERE user.name = "pepe" || "rone"
        ) u ON pets.owner = u.id
    GROUP BY pets.id;`
    expect(getParsedSql(sql)).to.be.equal("SELECT * FROM `pets` LEFT JOIN (SELECT * FROM `user` WHERE `user`.`name` = 'pepe' || 'rone') AS `u` ON `pets`.`owner` = `u`.`id` GROUP BY `pets`.`id`")
  })

  it('should support or combine with )', () => {
    let sql = `SELECT *
    FROM
        pets
        LEFT JOIN(
            SELECT * FROM user
            WHERE user.code = UPPER("test")
            OR user.name = "pepe") u ON pets.owner = u.id
    GROUP BY pets.id;`
    expect(getParsedSql(sql)).to.be.equal("SELECT * FROM `pets` LEFT JOIN (SELECT * FROM `user` WHERE `user`.`code` = UPPER('test') OR `user`.`name` = 'pepe') AS `u` ON `pets`.`owner` = `u`.`id` GROUP BY `pets`.`id`")
    sql = `SELECT *
    FROM
        pets
        LEFT JOIN(
            SELECT * FROM user
            WHERE user.name = "pepe" || "rone"
            OR user.code = UPPER("test")
            OR user.code = UPPER("more_test")
        ) u ON pets.owner = u.id
    GROUP BY pets.id;`
    expect(getParsedSql(sql)).to.be.equal("SELECT * FROM `pets` LEFT JOIN (SELECT * FROM `user` WHERE `user`.`name` = 'pepe' || 'rone' OR `user`.`code` = UPPER('test') OR `user`.`code` = UPPER('more_test')) AS `u` ON `pets`.`owner` = `u`.`id` GROUP BY `pets`.`id`")
  })

  it('should support json as function name', () => {
    const sql = `SELECT
      id,
      json_object(
          'hasGeometry',
          CASE
              WHEN json_extract(floor.rect, '$') IS '{"boundariesList":[]}' THEN json('false')
              ELSE json('true')
          END
      ) as "metadata"
  FROM
      floor
  WHERE
    floor.id = 1;`
    expect(getParsedSql(sql)).to.be.equal("SELECT `id`, json_object('hasGeometry', CASE WHEN json_extract(`floor`.`rect`, '$') IS '{\"boundariesList\":[]}' THEN json('false') ELSE json('true') END) AS `metadata` FROM `floor` WHERE `floor`.`id` = 1")
  })

  it('should support glob operator', () => {
    const sql = "SELECT device.id FROM device WHERE device.model GLOB '*XYZ';"
    expect(getParsedSql(sql)).to.be.equal("SELECT `device`.`id` FROM `device` WHERE `device`.`model` GLOB '*XYZ'")
  })

  it('should support create table...as', () => {
    const sql = `CREATE TABLE IF NOT EXISTS stg_devices AS SELECT * FROM devices WHERE 1 = 0;`
    expect(getParsedSql(sql)).to.be.equal('CREATE TABLE IF NOT EXISTS `stg_devices` AS SELECT * FROM `devices` WHERE 1 = 0')
  })

  it('should support escape single quote', () => {
    const sql = "SELECT name, 'doesn''t smoke' FROM people WHERE name = 'John';"
    expect(getParsedSql(sql)).to.be.equal("SELECT `name`, 'doesn''t smoke' FROM `people` WHERE `name` = 'John'")
  })

  it('should support window functions', () => {
    const sql = "SELECT MAX(amount) OVER (ORDER BY date ASC ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS max_amount FROM sales;"
    expect(getParsedSql(sql)).to.be.equal("SELECT MAX(`amount`) OVER (ORDER BY `date` ASC ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS `max_amount` FROM `sales`")
  })

  it('should support window functions with multiple preceding', () => {
    const sql = "SELECT MAX(amount) OVER (ORDER BY date ASC ROWS BETWEEN 2 PRECEDING AND 1 preceding) AS max_amount FROM sales;"
    expect(getParsedSql(sql)).to.be.equal("SELECT MAX(`amount`) OVER (ORDER BY `date` ASC ROWS BETWEEN 2 PRECEDING AND 1 PRECEDING) AS `max_amount` FROM `sales`")
  })
})
