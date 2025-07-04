// /pages/login/index.tsx

import React from "react";
import styles from "./style/Login.module.scss";

const LoginPage: React.FC = () => {
  return (
    <>
      <h1 className = {styles.heading}>Welcome to Company Name</h1>
      <form className={styles.login}>
        <input type="text" placeholder="Username" />
        <input type="password" placeholder="Password" />
        <button type="submit">Login</button>
      </form>
    </>
  );
};

export default LoginPage;
