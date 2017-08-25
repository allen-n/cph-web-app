<!DOCTYPE html>
<html>

<head>
  <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>
  <script>
    var myURL = "http://ec2-54-167-227-152.compute-1.amazonaws.com/~allen.nikka/v2proto/web_display.html"
    $(document).ready(function() {
      $("button").click(function() {
        $.ajax({
          url: myURL,
          success: function(result) {
            $("#div1").html(result);
          }
        });
      });
    });
  </script>
</head>

<body>

  <div id="div1">
    <h2>Let jQuery AJAX Change This Text</h2></div>

  <button>Get External Content</button>

</body>

</html>


<?php

print_r($_REQUEST)

?>
