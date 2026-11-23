package com.chargeplatform.order.service;
import com.chargeplatform.order.dto.OrderRequests;
import org.junit.jupiter.api.Test;
import jakarta.validation.Validation;
import static org.junit.jupiter.api.Assertions.*;
class CustomMinutesValidationTest {
 @Test void customMinuteRequestAcceptsOneAndRejectsOutOfRange(){
  try(var factory=Validation.buildDefaultValidatorFactory()){
   var validator=factory.getValidator();
   assertTrue(validator.validate(new OrderRequests.CustomerStart(7L,31L,"CUSTOM",1)).isEmpty());
   for(int minutes:new int[]{0,721})assertFalse(validator.validate(new OrderRequests.CustomerStart(7L,31L,"CUSTOM",minutes)).isEmpty());
  }
 }
}
