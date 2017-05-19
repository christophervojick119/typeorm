import "reflect-metadata";
import {createConnection, ConnectionOptions} from "../../src/index";
import {Employee} from "./entity/Employee";
import {Homesitter} from "./entity/Homesitter";
import {Student} from "./entity/Student";
import {Person} from "./entity/Person";

const options: ConnectionOptions = {
    driver: {
        type: "mysql",
        host: "localhost",
        port: 3306,
        username: "root",
        password: "admin",
        database: "test"
    },
    logging: {
        // logQueries: true,
        logOnlyFailedQueries: true,
        logFailedQueryError: true
    },
    autoSchemaSync: true,
    entities: [
        Person,
        Employee,
        Homesitter,
        Student
    ]
};

createConnection(options).then(async connection => {

    let employeeRepository = connection.getRepository(Employee);
    const employee = new Employee();
    employee.id = 1;
    employee.firstName = "umed";
    employee.lastName = "khudoiberdiev";
    employee.salary = 200000;

    console.log("saving the employee: ");
    await employeeRepository.save(employee);
    console.log("employee has been saved: ", employee);

    console.log("now loading the employee: ");
    const loadedEmployee = await employeeRepository.findOneById(1);
    console.log("loaded employee: ", loadedEmployee);

    console.log("-----------------");

    let homesitterRepository = connection.getRepository(Homesitter);
    const homesitter = new Homesitter();
    homesitter.id = 2;
    homesitter.firstName = "umed";
    homesitter.lastName = "khudoiberdiev";
    homesitter.numberOfKids = 5;

    console.log("saving the homesitter: ");
    await homesitterRepository.save(homesitter);
    console.log("homesitter has been saved: ", homesitter);

    console.log("now loading the homesitter: ");
    const loadedHomesitter = await homesitterRepository.findOneById(2);
    console.log("loaded homesitter: ", loadedHomesitter);

    console.log("-----------------");

    let studentRepository = connection.getRepository(Student);
    const student = new Student();
    student.id = 3;
    student.firstName = "umed";
    student.lastName = "khudoiberdiev";
    student.faculty = "computer science";

    console.log("saving the student: ");
    await studentRepository.save(student);
    console.log("student has been saved: ", student);

    console.log("now loading the student: ");
    const loadedStudent = await studentRepository.findOneById(3);
    console.log("loaded student: ", loadedStudent);

    console.log("-----------------");
    const secondEmployee = await employeeRepository.findOneById(2);
    console.log("Non exist employee: ", secondEmployee);
    const thirdEmployee = await employeeRepository.findOneById(3);
    console.log("Non exist employee: ", thirdEmployee);
    console.log("-----------------");
    const secondHomesitter = await homesitterRepository.findOneById(1);
    console.log("Non exist homesitter: ", secondHomesitter);
    const thirdHomesitter = await homesitterRepository.findOneById(3);
    console.log("Non exist homesitter: ", thirdHomesitter);
    console.log("-----------------");
    const secondStudent = await studentRepository.findOneById(1);
    console.log("Non exist student: ", secondStudent);
    const thirdStudent = await studentRepository.findOneById(2);
    console.log("Non exist student: ", thirdStudent);


}, error => console.log("Error: ", error));
