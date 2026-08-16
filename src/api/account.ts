import type { Http } from "../http.ts";
import { LaftelError } from "../errors.ts";

export class Account {
  constructor(private http: Http) {}

  /*
  certification(): Promise<unknown> {
    return this.http.get("accounts/certification/");
  }
  */

  /** Iamport 본인인증 연동. impUid는 프론트 Iamport SDK 인증 성공 콜백에서 받은 값. */
  certify(input: { impUid: string; parentImpUid?: string }): Promise<unknown> {
    return this.http.post("accounts/certification/", {
      body: { imp_uid: input.impUid, parent_imp_uid: input.parentImpUid },
    });
  }

  /** 비밀번호 변경. oldPassword가 틀리거나 newPassword가 기존과 같으면 406으로 throw됨. */
  changePassword(oldPassword: string, newPassword: string): Promise<{ status?: boolean; msg?: string }> {
    return this.http.post("v1.0/users/password/", { body: { old_password: oldPassword, new_password: newPassword } });
  }

  resetPassword(newPassword: string): Promise<{ msg?: string }> {
    return this.http.post("accounts/password/", { body: { new_password: newPassword } });
  }

  checkPassword(password: string): Promise<void> {
    return this.http.post("accounts/check_password/", { body: { password } });
  }

  /** 약관/마케팅 수신 동의. agreeToTerms는 기본 true. */
  consent(input: { marketingConsent: boolean; agreeToTerms?: boolean }): Promise<unknown> {
    return this.http.post("accounts/v1/my_consents/", {
      body: { is_marketing_consent: input.marketingConsent, is_agree_to_terms: input.agreeToTerms ?? true },
    });
  }

  /** 이메일 가입 가능 여부. 이미 쓰는 이메일이면 false, 아니면 true. */
  async emailAvailable(email: string): Promise<boolean> {
    try {
      await this.http.get("emails/v2/signup_check/", { query: { email }, anon: true });
      return true;
    } catch (e) {
      if (e instanceof LaftelError && e.code === "EMAIL_ALREADY_IN_USE") return false;
      throw e;
    }
  }

  /**
   * 이메일 인증코드(requestEmailAuth 발송) + 비밀번호로 가입. 성공 시 로그인 토큰(content.key) 반환.
   * 기존 이메일에 대해서도 동작하여 비밀번호 재설정 + 로그인 용도로 쓰임(응답 is_restored로 구분).
   */
  signup(
    input: { email: string; authCode: string; password: string },
  ): Promise<{ content?: { key?: string }; is_restored?: boolean }> {
    return this.http.post("v1.0/signup/email/", {
      anon: true,
      body: { email: input.email, auth_code: input.authCode, password1: input.password, password2: input.password },
    });
  }

  /** 이메일 인증코드 발송. isNewEmailAuth=true면 이메일 변경용 인증. */
  requestEmailAuth(input: { email: string; isNewEmailAuth?: boolean }): Promise<unknown> {
    return this.http.post("emails/v1/authorize/", {
      body: { email: input.email, is_new_email_auth: input.isNewEmailAuth },
    });
  }

  /** 발송된 인증코드(authCode) 확인. */
  confirmEmailAuth(input: { email: string; authCode: string }): Promise<unknown> {
    return this.http.patch("emails/v1/authorize/", { body: { email: input.email, auth_code: input.authCode } });
  }
}
