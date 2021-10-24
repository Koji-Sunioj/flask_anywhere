CREATE TABLE `city_points` (
  `city_id`	int NOT NULL AUTO_INCREMENT,
  `latitude` float DEFAULT NULL,
  `longitude` float DEFAULT NULL,
  PRIMARY KEY (`city_id`)
);

alter table customers
add column point_id int;

alter table customers
add foreign key (point_id) references city_points(city_id);

alter table suppliers add column point_id int;

alter table suppliers
add foreign key (point_id) references city_points(city_id);

CREATE TABLE `country_iso` (
  `country_id`	int NOT NULL AUTO_INCREMENT,
  `iso_code` varchar(2) NOT NULL,
  PRIMARY KEY (`country_id`)
);

alter table customers
add column iso_id int;

alter table w3.customers
add foreign key (iso_id) references country_iso(country_id);

alter table suppliers
add column iso_id int;

alter table w3.suppliers
add foreign key (iso_id) references country_iso(country_id);