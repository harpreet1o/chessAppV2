// fixing the error of the failed login 
//fixing the error of the res.cookie 
res.cookie('token', token, { httpOnly: true, secure: false, sameSite: "lax", path: '/' });
 to 
 res.cookie('token', token, { httpOnly: true, secure: true, sameSite: "none" , path: '/' });

// error at the end of game 
