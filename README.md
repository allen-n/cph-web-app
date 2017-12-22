

URL: http://ec2-54-187-114-1.us-west-2.compute.amazonaws.com:4567/LandingV2.html

running the node: "node serverCPHV2.html"

Log-in info: 
user_id | password   | userName | particle_user | particle_pass | text1 | dataTable_name  |
+---------+------------+----------+---------------+---------------+-------+-----------------+
|       1 | passwordA1 | userA1   | NULL          | NULL          | NULL  | timeEntryuserA1 |

CPH SQL Database creation

mysql -u root -p 

create database CPHSQL


CREATE user ‘CPH’@‘localhost' identified BY ‘secretSAUCE’
GRANT SELECT,INSERT,UPDATE,DELETE on CPHSQL.* to CPH@‘localhost'

CREATE TABLE users(
	user_id MEDIUMINT NOT NULL AUTO_INCREMENT,
	password VARCHAR(200) NOT NULL,
	userName VARCHAR(150) NOT NULL,
	particle_user VARCHAR(150),
	particle_pass VARCHAR(150),
	text1 VARCHAR(150),
	dataTable_name VARCHAR(150) NOT NULL,
	PRIMARY KEY (user_id)) 

INSERT INTO users (password, userName, dataTable_name) VALUES (passwordA1, userA1, timeEntryuserA1) // 


CREATE TABLE timeEntryuserA2(
	event_id MEDIUMINT NOT NULL AUTO_INCREMENT,
	time TIMESTAMP NOT NULL,
	current FLOAT,
	voltage FLOAT,
	power FLOAT,
	x1 FLOAT,
	x2 FLOAT,
	x3 FLOAT,
	text1 VARCHAR(150),
	text2 VARCHAR(150),
	text3 VARCHAR(150),
	PRIMARY KEY (event_id))

create table devices(
	device_id MEDIUMINT NOT NULL AUTO_INCREMENT,
	time TIMESTAMP NOT NULL,
	current FLOAT,
	voltage FLOAT,
	power FLOAT,
	x1 FLOAT,
	text1 VARCHAR(150),
	PRIMARY KEY (device_id))