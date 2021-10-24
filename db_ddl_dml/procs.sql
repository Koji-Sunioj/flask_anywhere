DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `db_rels`()
BEGIN
SELECT Table_name,Column_name FROM information_schema.columns WHERE table_schema = 'w3'
and table_name in ('categories','customers','employees','order_details','orders','products','shippers','suppliers');
END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `test_bi`()
BEGIN
SELECT orders.OrderDate,orders.OrderID,order_details.OrderDetailID,order_details.Quantity,products.ProductName,products.Price,products.Price * order_details.Quantity as 'Total',categories.CategoryName,
customers.CustomerName,customers.City as 'CustomerCity',customers.Country as 'CustomerCountry',
shippers.ShipperName,suppliers.SupplierName,suppliers.Country as 'SupplierCountry',concat( employees.FirstName,' ',employees.LastName) as 'EmployeeName'
FROM orders
join order_details on order_details.OrderID = orders.OrderID
join products on order_details.ProductID = products.ProductID
join categories on products.CategoryID = categories.CategoryID
join suppliers on products.SupplierID = suppliers.SupplierID
join customers on customers.CustomerID = orders.CustomerID
join employees on orders.EmployeeID = employees.EmployeeID
join shippers on orders.ShipperID = shippers.ShipperID;

END$$
DELIMITER ;

DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `test_dynamic`(

IN column_req varchar(255),
IN table_req varchar(255)
)
BEGIN

SET @s = CONCAT(
        'select ',column_req,' from ',table_req
         
    );
    PREPARE stmt FROM @s;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;

END$$
DELIMITER ;